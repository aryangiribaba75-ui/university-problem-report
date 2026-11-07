javascript
document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // IMAGE UPLOAD
    // =========================================================

    const imageInput = document.getElementById("imageInput");
    const imageUploadArea = document.getElementById("imageUploadArea");
    const imagePreview = document.getElementById("imagePreview");
    const imagePreviewThumb = document.getElementById("imagePreviewThumb");
    const imageFileName = document.getElementById("imageFileName");
    const imageFileSize = document.getElementById("imageFileSize");
    const removeImageBtn = document.getElementById("removeImageBtn");
    const imageError = document.getElementById("imageError");

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB


    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }

        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }


    function showImagePreview(file) {

        imageError.textContent = "";

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            imageError.textContent =
                "Please select a JPG, PNG or WEBP image.";

            imageInput.value = "";
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            imageError.textContent =
                "Image size must be 5MB or less.";

            imageInput.value = "";
            return;
        }


        const reader = new FileReader();

        reader.onload = (event) => {

            imagePreviewThumb.src = event.target.result;

            imageFileName.textContent = file.name;
            imageFileSize.textContent = formatFileSize(file.size);

            imagePreview.style.display = "flex";
            imageUploadArea.style.display = "none";
        };

        reader.readAsDataURL(file);
    }


    if (imageInput) {

        imageInput.addEventListener("change", () => {

            const file = imageInput.files[0];

            showImagePreview(file);

        });

    }


    if (imageUploadArea && imageInput) {

        imageUploadArea.addEventListener("click", () => {

            imageInput.click();

        });


        imageUploadArea.addEventListener("keydown", (event) => {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();

                imageInput.click();

            }

        });

    }


    if (removeImageBtn) {

        removeImageBtn.addEventListener("click", () => {

            imageInput.value = "";

            imagePreviewThumb.src = "";

            imageFileName.textContent = "";
            imageFileSize.textContent = "";

            imagePreview.style.display = "none";
            imageUploadArea.style.display = "flex";

            imageError.textContent = "";

        });

    }


    // =========================================================
    // VIDEO UPLOAD
    // =========================================================

    const videoInput = document.getElementById("videoInput");
    const videoUploadArea = document.getElementById("videoUploadArea");
    const videoPreview = document.getElementById("videoPreview");
    const videoFileName = document.getElementById("videoFileName");
    const videoFileSize = document.getElementById("videoFileSize");
    const removeVideoBtn = document.getElementById("removeVideoBtn");
    const videoError = document.getElementById("videoError");

    const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25 MB


    if (videoInput) {

        videoInput.addEventListener("change", () => {

            const file = videoInput.files[0];

            if (!file) {
                return;
            }

            videoError.textContent = "";

            const allowedTypes = [
                "video/mp4",
                "video/webm"
            ];

            if (!allowedTypes.includes(file.type)) {

                videoError.textContent =
                    "Please select an MP4 or WEBM video.";

                videoInput.value = "";

                return;
            }


            if (file.size > MAX_VIDEO_SIZE) {

                videoError.textContent =
                    "Video size must be 25MB or less.";

                videoInput.value = "";

                return;
            }


            videoFileName.textContent = file.name;
            videoFileSize.textContent = formatFileSize(file.size);

            videoPreview.style.display = "flex";
            videoUploadArea.style.display = "none";

        });

    }


    if (videoUploadArea && videoInput) {

        videoUploadArea.addEventListener("click", () => {

            videoInput.click();

        });


        videoUploadArea.addEventListener("keydown", (event) => {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();

                videoInput.click();

            }

        });

    }


    if (removeVideoBtn) {

        removeVideoBtn.addEventListener("click", () => {

            videoInput.value = "";

            videoFileName.textContent = "";
            videoFileSize.textContent = "";

            videoPreview.style.display = "none";
            videoUploadArea.style.display = "flex";

            videoError.textContent = "";

        });

    }


    // =========================================================
    // CAMERA
    // =========================================================

    const cameraBtn = document.getElementById("cameraBtn");
    const cameraContainer = document.getElementById("cameraContainer");
    const cameraPreview = document.getElementById("cameraPreview");
    const captureBtn = document.getElementById("captureBtn");
    const closeCameraBtn = document.getElementById("closeCameraBtn");
    const retakeBtn = document.getElementById("retakeBtn");
    const photoCanvas = document.getElementById("photoCanvas");
    const capturedPhoto = document.getElementById("capturedPhoto");
    const photoContainer = document.getElementById("photoContainer");
    const cameraError = document.getElementById("cameraError");

    let cameraStream = null;


    // ---------------------------------------------------------
    // OPEN CAMERA
    // ---------------------------------------------------------

    if (cameraBtn) {

        cameraBtn.addEventListener("click", async () => {

            cameraError.textContent = "";

            // Check browser support
            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                cameraError.textContent =
                    "Camera is not supported by this browser.";

                return;
            }


            try {

                cameraStream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "environment"
                        },
                        audio: false
                    });


                cameraPreview.srcObject = cameraStream;

                cameraContainer.hidden = false;

                cameraBtn.hidden = true;

                await cameraPreview.play();

            } catch (error) {

                console.error("Camera error:", error);

                if (error.name === "NotAllowedError") {

                    cameraError.textContent =
                        "Camera permission was denied. Please allow camera access in your browser.";

                } else if (error.name === "NotFoundError") {

                    cameraError.textContent =
                        "No camera was found on this device.";

                } else {

                    cameraError.textContent =
                        "Unable to access the camera. Please try again.";

                }

            }

        });

    }


    // ---------------------------------------------------------
    // CAPTURE PHOTO
    // ---------------------------------------------------------

    if (captureBtn) {

        captureBtn.addEventListener("click", () => {

            if (!cameraStream) {
                return;
            }


            if (
                cameraPreview.videoWidth === 0 ||
                cameraPreview.videoHeight === 0
            ) {

                cameraError.textContent =
                    "Camera is not ready yet. Please wait.";

                return;
            }


            photoCanvas.width = cameraPreview.videoWidth;
            photoCanvas.height = cameraPreview.videoHeight;


            const context =
                photoCanvas.getContext("2d");


            context.drawImage(
                cameraPreview,
                0,
                0,
                photoCanvas.width,
                photoCanvas.height
            );


            const photoData =
                photoCanvas.toDataURL("image/jpeg", 0.9);


            capturedPhoto.src = photoData;

            photoContainer.hidden = false;

            stopCamera();

            cameraContainer.hidden = true;

            cameraBtn.hidden = true;

        });

    }


    // ---------------------------------------------------------
    // CLOSE CAMERA
    // ---------------------------------------------------------

    if (closeCameraBtn) {

        closeCameraBtn.addEventListener("click", () => {

            stopCamera();

            cameraContainer.hidden = true;

            cameraBtn.hidden = false;

        });

    }


    // ---------------------------------------------------------
    // RETAKE PHOTO
    // ---------------------------------------------------------

    if (retakeBtn) {

        retakeBtn.addEventListener("click", async () => {

            photoContainer.hidden = true;

            cameraBtn.hidden = false;

            // User must click camera button again.
            // This keeps permission/camera activation intentional.

        });

    }


    // ---------------------------------------------------------
    // STOP CAMERA
    // ---------------------------------------------------------

    function stopCamera() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(track => track.stop());

            cameraStream = null;

        }


        if (cameraPreview) {

            cameraPreview.srcObject = null;

        }

    }


    // ---------------------------------------------------------
    // STOP CAMERA WHEN LEAVING PAGE
    // ---------------------------------------------------------

    window.addEventListener("beforeunload", () => {

        stopCamera();

    });
});
