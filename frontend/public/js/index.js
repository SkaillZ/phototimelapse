document.addEventListener('DOMContentLoaded', async () => {
  let video = document.getElementById('camera-video');
  let submitButton = document.getElementById('submit-button');
  let nameText = document.getElementById('name');

  // Show the video stream
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    let stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();

    video.addEventListener('loadedmetadata', () => {
      submitButton.disabled = false;
    });
  }

  // Capture and upload the photo
  submitButton.addEventListener('click', () => {
    let captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    let context = captureCanvas.getContext('2d');
    context.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    // Convert to JPEG
    captureCanvas.toBlob(async jpegData => {
      // Send
      var formData = new FormData();
      formData.append('name', nameText.value);
      formData.append('image', jpegData, 'image.jpg');

      try {
        await fetch('/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (e) {
        alert(`An error occured: ${e}`);
      }
    }, 'image/jpeg');
  });
});
