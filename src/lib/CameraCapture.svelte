<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onDestroy } from 'svelte';

	let video: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let photoInput: HTMLInputElement;
	let stream: MediaStream | null = null;
	let capturedImage: string | null = null;
	let isCapturing = false;
	let isProcessing = false;
	let error = '';
	let selectedCamera = 'back'; // 'front' or 'back'
	let availableCameras: MediaDeviceInfo[] = [];
	let currentCameraId: string | null = null;
	let extractedData: any = null;
	let currentStep = 'scan'; // 'scan', 'review', 'approved', 'rejected'
	let scannedPerson: any = null;

	// Get form data from the page store
	$: form = $page.form;
	
	// Debug form data
	$: if (form) {
		console.log('Form data updated:', form);
	}
	
	// Debug extracted data
	$: if (extractedData) {
		console.log('Extracted data updated locally:', extractedData);
	}

	async function getAvailableCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter(device => device.kind === 'videoinput');
			console.log('Available cameras:', availableCameras);
		} catch (err) {
			console.error('Error getting camera devices:', err);
		}
	}

	async function startCamera() {
		try {
			error = '';
			
			// Get available cameras first
			await getAvailableCameras();
			
			// Find the appropriate camera based on selection
			let cameraId: string | undefined;
			let facingMode: VideoFacingModeEnum | undefined;
			
			if (selectedCamera === 'back') {
				// Try to find back camera by label or use facingMode
				const backCamera = availableCameras.find(camera => 
					camera.label.toLowerCase().includes('back') || 
					camera.label.toLowerCase().includes('rear')
				);
				if (backCamera) {
					cameraId = backCamera.deviceId;
				} else {
					facingMode = 'environment'; // Back camera
				}
			} else {
				// Try to find front camera by label or use facingMode
				const frontCamera = availableCameras.find(camera => 
					camera.label.toLowerCase().includes('front') || 
					camera.label.toLowerCase().includes('user')
				);
				if (frontCamera) {
					cameraId = frontCamera.deviceId;
				} else {
					facingMode = 'user'; // Front camera
				}
			}

			const constraints: MediaStreamConstraints = {
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 },
					...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode })
				}
			};

			stream = await navigator.mediaDevices.getUserMedia(constraints);
			currentCameraId = cameraId || null;
			
			if (video) {
				video.srcObject = stream;
				video.play();
			}
		} catch (err) {
			console.error('Error accessing camera:', err);
			error = 'Unable to access camera. Please check permissions.';
		}
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
		if (video) {
			video.srcObject = null;
		}
		capturedImage = null;
		currentCameraId = null;
	}

	async function switchCamera() {
		// Stop current camera
		stopCamera();
		
		// Toggle camera selection
		selectedCamera = selectedCamera === 'front' ? 'back' : 'front';
		
		// Start with new camera
		await startCamera();
	}

	function capturePhoto() {
		if (!video || !canvas) return;
		
		isCapturing = true;
		
		// Set canvas dimensions to match video
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		
		// Draw the current video frame to canvas
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.drawImage(video, 0, 0);
			capturedImage = canvas.toDataURL('image/jpeg', 0.8);
		}
		
		isCapturing = false;
	}

	function retakePhoto() {
		capturedImage = null;
		extractedData = null; // Clear extracted data when retaking
		currentStep = 'scan';
		scannedPerson = null;
	}

	function proceedToReview() {
		if (extractedData) {
			scannedPerson = extractedData;
			currentStep = 'review';
		}
	}

	function approvePerson() {
		currentStep = 'approved';
		// Here you could send approval to backend
		console.log('Person approved:', scannedPerson);
	}

	function rejectPerson() {
		currentStep = 'rejected';
		// Here you could send rejection to backend
		console.log('Person rejected:', scannedPerson);
	}

	function startNewScan() {
		currentStep = 'scan';
		capturedImage = null;
		extractedData = null;
		scannedPerson = null;
	}

	function selectFromFiles() {
		photoInput.click();
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				capturedImage = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	// Initialize camera detection when component mounts
	import { onMount } from 'svelte';
	onMount(() => {
		getAvailableCameras();
	});

	// Clean up camera when component is destroyed
	onDestroy(() => {
		stopCamera();
	});
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
	<h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Security Checkpoint</h2>
	
	<!-- Progress Steps -->
	<div class="flex justify-center mb-6">
		<div class="flex items-center space-x-4">
			<div class="flex items-center">
				<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium {currentStep === 'scan' ? 'bg-blue-500 text-white' : currentStep === 'review' || currentStep === 'approved' || currentStep === 'rejected' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}">1</div>
				<span class="ml-2 text-sm font-medium {currentStep === 'scan' ? 'text-blue-600' : currentStep === 'review' || currentStep === 'approved' || currentStep === 'rejected' ? 'text-green-600' : 'text-gray-500'}">Scan ID</span>
			</div>
			<div class="w-8 h-0.5 {currentStep === 'review' || currentStep === 'approved' || currentStep === 'rejected' ? 'bg-green-500' : 'bg-gray-300'}"></div>
			<div class="flex items-center">
				<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium {currentStep === 'review' ? 'bg-blue-500 text-white' : currentStep === 'approved' || currentStep === 'rejected' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}">2</div>
				<span class="ml-2 text-sm font-medium {currentStep === 'review' ? 'text-blue-600' : currentStep === 'approved' || currentStep === 'rejected' ? 'text-green-600' : 'text-gray-500'}">Review</span>
			</div>
		</div>
	</div>
	
	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
			{form.message}
			{#if form.fileName}
				<br><span class="text-sm">File: {form.fileName} ({(form.fileSize / 1024).toFixed(1)} KB)</span>
			{/if}
		</div>
	{/if}

	{#if isProcessing}
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
			<div class="flex items-center">
				<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
				<p class="text-yellow-800 font-medium">🤖 Analyzing image with AI...</p>
			</div>
		</div>
	{/if}

	{#if currentStep === 'review' && scannedPerson}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
			<h3 class="text-lg font-semibold text-blue-800 mb-3">👤 Person Details - Review Required</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div class="bg-white p-3 rounded border">
					<div class="text-sm font-medium text-gray-600">First Name:</div>
					<p class="text-gray-900 font-medium">{scannedPerson.firstName}</p>
				</div>
				<div class="bg-white p-3 rounded border">
					<div class="text-sm font-medium text-gray-600">Last Name:</div>
					<p class="text-gray-900 font-medium">{scannedPerson.lastName}</p>
				</div>
				<div class="bg-white p-3 rounded border">
					<div class="text-sm font-medium text-gray-600">ID Number:</div>
					<p class="text-gray-900 font-medium">{scannedPerson.idNumber}</p>
				</div>
				<div class="bg-white p-3 rounded border">
					<div class="text-sm font-medium text-gray-600">Serial Number:</div>
					<p class="text-gray-900 font-medium">{scannedPerson.serialNumber}</p>
				</div>
			</div>
			
			<!-- Approval/Rejection Buttons -->
			<div class="mt-6 flex gap-3">
				<button
					onclick={approvePerson}
					class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
				>
					✅ Approve Access
				</button>
				<button
					onclick={rejectPerson}
					class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
				>
					❌ Deny Access
				</button>
			</div>
			
			<div class="mt-4 text-center">
				<button
					onclick={startNewScan}
					class="text-gray-500 hover:text-gray-700 underline text-sm"
				>
					Scan Another ID
				</button>
			</div>
		</div>
	{/if}

	{#if currentStep === 'approved'}
		<div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-4 text-center">
			<div class="text-6xl mb-4">✅</div>
			<h3 class="text-2xl font-bold text-green-800 mb-2">Access Approved</h3>
			<p class="text-green-700 mb-4">Person has been granted access</p>
			<div class="bg-white p-4 rounded border mb-4">
				<p class="text-sm text-gray-600">Approved for:</p>
				<p class="font-semibold text-gray-900">{scannedPerson?.firstName} {scannedPerson?.lastName}</p>
				<p class="text-xs text-gray-500">ID: {scannedPerson?.idNumber}</p>
			</div>
			<button
				onclick={startNewScan}
				class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
			>
				Scan Next Person
			</button>
		</div>
	{/if}

	{#if currentStep === 'rejected'}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-4 text-center">
			<div class="text-6xl mb-4">❌</div>
			<h3 class="text-2xl font-bold text-red-800 mb-2">Access Denied</h3>
			<p class="text-red-700 mb-4">Person has been denied access</p>
			<div class="bg-white p-4 rounded border mb-4">
				<p class="text-sm text-gray-600">Denied for:</p>
				<p class="font-semibold text-gray-900">{scannedPerson?.firstName} {scannedPerson?.lastName}</p>
				<p class="text-xs text-gray-500">ID: {scannedPerson?.idNumber}</p>
			</div>
			<button
				onclick={startNewScan}
				class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
			>
				Scan Next Person
			</button>
		</div>
	{/if}

	{#if currentStep === 'scan' && !capturedImage}
		<!-- Camera View -->
		<div class="relative bg-gray-100 rounded-lg overflow-hidden mb-4">
			<video
				bind:this={video}
				class="w-full h-64 object-cover"
				autoplay
				muted
				playsinline
			></video>
			
			{#if !stream}
				<div class="absolute inset-0 flex items-center justify-center bg-gray-200">
					<div class="text-center">
						<svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
						</svg>
						<p class="text-gray-600">Camera not started</p>
					</div>
				</div>
			{:else}
				<!-- Camera Status Indicator -->
				<div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
					{selectedCamera === 'back' ? '📷 Back' : '🤳 Front'}
				</div>
			{/if}
		</div>

		<!-- Camera Selection -->
		<div class="mb-4">
			<div class="block text-sm font-medium text-gray-700 mb-2">Camera:</div>
			<div class="flex gap-2">
				<button
					onclick={() => { selectedCamera = 'back'; if (stream) switchCamera(); }}
					class="flex-1 py-2 px-4 rounded transition-colors {selectedCamera === 'back' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
				>
					📷 Back Camera
				</button>
				<button
					onclick={() => { selectedCamera = 'front'; if (stream) switchCamera(); }}
					class="flex-1 py-2 px-4 rounded transition-colors {selectedCamera === 'front' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
				>
					🤳 Front Camera
				</button>
			</div>
			{#if availableCameras.length === 0}
				<p class="text-xs text-gray-500 mt-1">Detecting cameras...</p>
			{:else if availableCameras.length === 1}
				<p class="text-xs text-gray-500 mt-1">Only one camera detected</p>
			{:else}
				<p class="text-xs text-gray-500 mt-1">{availableCameras.length} cameras detected</p>
			{/if}
		</div>

		<!-- Camera Controls -->
		<div class="flex gap-2 mb-4">
			{#if !stream}
				<button
					onclick={startCamera}
					class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					Start Camera
				</button>
			{:else}
				<button
					onclick={capturePhoto}
					disabled={isCapturing}
					class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					{isCapturing ? 'Capturing...' : 'Capture Photo'}
				</button>
				<button
					onclick={switchCamera}
					class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors"
					title="Switch Camera"
				>
					🔄
				</button>
				<button
					onclick={stopCamera}
					class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					Stop Camera
				</button>
			{/if}
		</div>

		<div class="text-center">
			<button
				onclick={selectFromFiles}
				class="text-blue-500 hover:text-blue-700 underline"
			>
				Or select from files
			</button>
			<input
				bind:this={photoInput}
				type="file"
				accept="image/*"
				onchange={handleFileSelect}
				class="hidden"
			/>
		</div>
	{:else if currentStep === 'scan' && capturedImage}
		<!-- Captured Image Preview -->
		<div class="mb-4">
			<img
				src={capturedImage}
				alt=""
				class="w-full h-64 object-cover rounded-lg"
			/>
		</div>

		<!-- Form to submit the photo -->
		<form method="POST" action="?/uploadPhoto" use:enhance={() => {
			isProcessing = true;
			extractedData = null; // Clear previous data
			return async ({ update, result }) => {
				await update();
				isProcessing = false;
				
				// Handle the result
				if (result.type === 'success' && result.data?.extractedData) {
					extractedData = result.data.extractedData;
					console.log('Extracted data stored locally:', extractedData);
					// Automatically proceed to review step
					setTimeout(() => {
						proceedToReview();
					}, 1000); // Small delay to show success message
				}
			};
		}}>
			<input type="hidden" name="photo" value={capturedImage} />
			
			<div class="flex gap-2">
				<button
					type="submit"
					disabled={isProcessing}
					class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					{isProcessing ? 'Processing...' : 'Extract Details'}
				</button>
				<button
					type="button"
					onclick={retakePhoto}
					disabled={isProcessing}
					class="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
				>
					Retake
				</button>
			</div>
		</form>
	{/if}

	<!-- Hidden canvas for capturing -->
	<canvas bind:this={canvas} class="hidden"></canvas>
</div>
