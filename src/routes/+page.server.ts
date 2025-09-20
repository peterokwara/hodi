import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';

interface ExtractedData {
	firstName: string;
	lastName: string;
	idNumber: string;
	serialNumber: string;
}

async function extractPersonalDetails(imageData: string): Promise<ExtractedData> {
	if (!env.OPENROUTER_API_KEY) {
		throw new Error('OPENROUTER_API_KEY environment variable is not set');
	}

	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'x-ai/grok-4-fast:free',
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: `Please analyze this image and extract the following personal details in JSON format:
							{
								"firstName": "string",
								"lastName": "string", 
								"idNumber": "string",
								"serialNumber": "string"
							}
							
							Look for:
							- First name (given name)
							- Last name (surname/family name)
							- ID number (any identification number like passport, driver's license, national ID)
							- Serial number (any serial number visible on the document)
							
							If any information is not visible or unclear, use "Not Found" as the value.
							Return only the JSON object, no additional text.`
						},
						{
							type: 'image_url',
							image_url: {
								url: imageData
							}
						}
					]
				}
			]
		})
	});

	if (!response.ok) {
		throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	const content = data.choices?.[0]?.message?.content;
	
	if (!content) {
		throw new Error('No content received from OpenRouter API');
	}

	// Try to parse the JSON response
	try {
		// Clean the response in case there's extra text
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		const jsonString = jsonMatch ? jsonMatch[0] : content;
		return JSON.parse(jsonString);
	} catch (parseError) {
		console.error('Failed to parse JSON response:', content);
		throw new Error('Failed to parse extracted data');
	}
}

export const actions: Actions = {
	uploadPhoto: async ({ request }) => {
		try {
			const formData = await request.formData();
			const photoData = formData.get('photo') as string;
			
			if (!photoData) {
				return fail(400, {
					error: 'No photo provided'
				});
			}

			// Validate that it's a base64 image
			if (!photoData.startsWith('data:image/')) {
				return fail(400, {
					error: 'Invalid image data'
				});
			}

			// Extract the base64 data and calculate size
			const base64Data = photoData.split(',')[1];
			const imageSize = Math.round((base64Data.length * 3) / 4); // Approximate size in bytes
			
			// Validate file size (max 10MB)
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (imageSize > maxSize) {
				return fail(400, {
					error: 'Image size must be less than 10MB'
				});
			}

			// Extract image type from data URL
			const imageType = photoData.match(/data:image\/([^;]+)/)?.[1] || 'unknown';

			console.log('Processing image with OpenRouter API...');

			// Extract personal details using OpenRouter API
			const extractedData = await extractPersonalDetails(photoData);

			console.log('Extracted data:', extractedData);

			return {
				success: true,
				message: 'Photo processed and details extracted successfully!',
				fileName: `captured_photo.${imageType}`,
				fileSize: imageSize,
				extractedData
			};
		} catch (error) {
			console.error('Error processing photo:', error);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Failed to process photo'
			});
		}
	}
};
