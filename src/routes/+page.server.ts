import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

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

			// Here you would typically save the file to a storage service
			// For now, we'll just log the details
			console.log('Photo received:', {
				type: `image/${imageType}`,
				size: imageSize,
				base64Length: base64Data.length
			});

			// In a real application, you might:
			// 1. Convert base64 to Buffer and save to cloud storage (AWS S3, Cloudinary, etc.)
			// 2. Save to local filesystem
			// 3. Process the image (resize, compress, etc.)
			// 4. Save metadata to database

			return {
				success: true,
				message: 'Photo uploaded successfully!',
				fileName: `captured_photo.${imageType}`,
				fileSize: imageSize
			};
		} catch (error) {
			console.error('Error uploading photo:', error);
			return fail(500, {
				error: 'Failed to upload photo'
			});
		}
	}
};
