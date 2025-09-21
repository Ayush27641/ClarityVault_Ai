const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

class FileProcessingService {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        if (!this.apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is required');
        }
        this.baseUrl = 'https://generativelanguage.googleapis.com';
    }

    async getResponse(file, prompt) {
        try {
            const fileUri = await this.uploadFileToGoogle(file);
            return await this.generateContent(fileUri, prompt);
        } catch (error) {
            console.error('Error in getResponse:', error);
            throw new Error(`File processing failed: ${error.message}`);
        }
    }

    async uploadFileToGoogle(file) {
        try {
            const uploadUrl = `${this.baseUrl}/upload/v1beta/files?key=${this.apiKey}`;

            // Start resumable upload session
            const startHeaders = {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': file.size.toString(),
                'X-Goog-Upload-Header-Content-Type': file.mimetype,
                'Content-Type': 'application/json'
            };

            const jsonBody = {
                file: {
                    display_name: file.originalname
                }
            };

            const startResponse = await axios.post(uploadUrl, jsonBody, {
                headers: startHeaders
            });

            const sessionUri = startResponse.headers['x-goog-upload-url'];
            if (!sessionUri) {
                throw new Error('Failed to obtain upload session URI');
            }

            // Upload file content
            const uploadHeaders = {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'upload, finalize',
                'X-Goog-Upload-Offset': '0',
                'Content-Type': 'application/octet-stream'
            };

            const uploadResponse = await axios.post(sessionUri, file.buffer, {
                headers: uploadHeaders
            });

            return uploadResponse.data.file.uri;
        } catch (error) {
            console.error('Error uploading file to Google:', error);
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    async generateContent(fileUri, prompt) {
        try {
            const url = `${this.baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                fileData: {
                                    fileUri: fileUri
                                }
                            },
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(url, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error generating content:', error);
            throw new Error(`Content generation failed: ${error.message}`);
        }
    }

    async generateTranslation(prompt, language) {
        try {
            const updatedPrompt = ` ${prompt}\n\n` +
                `Given the text above translate the given text in ${language} ` +
                'and maintain the original structure and formatting as much as possible. and dont give extra text';

            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: updatedPrompt
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(
                `${this.baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error generating translation:', error);
            throw new Error(`Translation failed: ${error.message}`);
        }
    }

    async analyzeText(text, language, documentType) {
        try {
            let analysisPrompt;

            // Check if it's a small section or just wants meaning explanation
            if (documentType.toLowerCase().includes('meaning') || 
                documentType.toLowerCase().includes('definition') ||
                documentType.toLowerCase().includes('explain') || 
                text.length < 500) {

                analysisPrompt = `Explain the meaning and significance of the following text in ${language}:\n\n` +
                    `Text: ${text}\n\n` +
                    `Document/Section Type: ${documentType}\n\n` +
                    `Please provide:\n` +
                    `1. MEANING: Clear explanation of what this text means\n` +
                    `2. KEY TERMS: Definition of any technical, legal, or specialized terms\n` +
                    `3. CONTEXT: Why this is important in the context of ${documentType}\n` +
                    `4. IMPLICATIONS: What this means for the parties involved\n\n` +
                    `Keep the explanation clear and concise in ${language}.`;

            } else {
                // Full document analysis
                analysisPrompt = `Analyze the following ${documentType} document and provide a comprehensive analysis in ${language}:\n\n` +
                    `Document Text: ${text}\n\n` +
                    `Document Type: ${documentType}\n\n` +
                    `Please provide analysis in the following format:\n\n` +
                    `DOCUMENT OVERVIEW:\n` +
                    `- Brief description of this ${documentType} and its purpose\n\n` +
                    `KEY TERMS AND DEFINITIONS:\n` +
                    `- [List and explain any technical, financial, or legal terms specific to ${documentType}]\n\n` +
                    `FINANCIAL CALCULATIONS (if applicable):\n` +
                    `- [For financial documents, perform relevant calculations such as:\n` +
                    `  * Total amounts, interest calculations, payment schedules\n` +
                    `  * Monthly/yearly costs, percentages, rates\n` +
                    `  * Due dates, penalties, late fees]\n\n` +
                    `IMPORTANT CLAUSES AND OBLIGATIONS:\n` +
                    `- [Highlight key responsibilities, rights, and obligations of parties involved]\n\n` +
                    `CRITICAL DATES AND DEADLINES:\n` +
                    `- [Extract and list any important dates, deadlines, or time-sensitive information]\n\n` +
                    `RISKS AND CONCERNS:\n` +
                    `- [Identify potential risks, penalties, or areas of concern specific to ${documentType}]\n\n` +
                    `ACTIONABLE ITEMS:\n` +
                    `- [What actions need to be taken based on this ${documentType}]\n\n` +
                    `SUMMARY:\n` +
                    `- [Provide a concise summary of the document's purpose and main points]\n\n` +
                    `Please ensure all explanations are clear and in ${language} language.`;
            }

            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: analysisPrompt
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(
                `${this.baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error analyzing text:', error);
            throw new Error(`Text analysis failed: ${error.message}`);
        }
    }
}

module.exports = FileProcessingService;