// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the QR code scanner
    initializeScanner();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize EmailJS (replace with your actual User ID)
    // emailjs.init("your_emailjs_user_id");
    
    // Initialize the UI state
    updateScannedItemsCount();
    
    // Register service worker for PWA support
    registerServiceWorker();
});

// Global variables
let html5QrCode = null;
let scannedItems = [];
let isScanning = false;

// Function to register service worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

// Function to initialize the QR code scanner
function initializeScanner() {
    // Create a new instance of the scanner
    html5QrCode = new Html5Qrcode("reader");
    
    // iOS Safari specific handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS) {
        console.log("iOS device detected");
        // Add iOS-specific message
        const iosMessage = document.createElement('div');
        iosMessage.className = 'ios-message';
        iosMessage.innerHTML = '<p><strong>iOS Users:</strong> If camera doesn\'t work, please try:</p>' +
                              '<ul>' +
                              '<li>Using Safari browser</li>' +
                              '<li>Ensuring camera permissions are allowed</li>' +
                              '<li>Using the manual entry option below</li>' +
                              '</ul>';
        
        const scannerSection = document.getElementById('scanner-section');
        scannerSection.insertBefore(iosMessage, document.getElementById('manual-entry'));
        
        // For iOS Safari, we need to handle the camera differently
        if (isSafari) {
            console.log("Safari on iOS detected - applying special handling");
            // Safari on iOS may need a user interaction before accessing camera
            document.getElementById('startScanBtn').addEventListener('click', function() {
                // Force a small delay to ensure UI is updated before camera access
                setTimeout(() => {
                    // This helps Safari initialize the camera properly
                    document.getElementById('reader').focus();
                }, 100);
            });
        }
    }
}

// Function to set up all event listeners
function setupEventListeners() {
    // Tab navigation
    setupTabNavigation();
    
    // Start scanning button
    document.getElementById('startScanBtn').addEventListener('click', startScanning);
    
    // Stop scanning button
    document.getElementById('stopScanBtn').addEventListener('click', stopScanning);
    
    // Generate PDF button
    document.getElementById('generatePdfBtn').addEventListener('click', generateDeliveryNote);
    
    // Send Email button
    document.getElementById('sendEmailBtn').addEventListener('click', sendEmail);
    
    // Manual QR code entry button
    document.getElementById('processManualQrBtn').addEventListener('click', processManualQrCode);
    
    // Add touch events for better mobile experience
    addTouchEvents();
}

// Function to set up tab navigation
function setupTabNavigation() {
    // Top tab buttons (for tablet and larger screens)
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId, tabButtons);
        });
    });
    
    // Bottom navigation buttons (for mobile)
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId, navButtons);
        });
    });
}

// Function to switch between tabs
function switchTab(tabId, buttonGroup) {
    // Hide all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Show the selected tab pane
    document.getElementById(tabId).classList.add('active');
    
    // Update active state for tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update active state for nav buttons
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Special handling for scanner tab
    if (tabId === 'scanner-section' && isScanning) {
        // Resume scanning if we were scanning before
        html5QrCode.resume();
    } else if (isScanning) {
        // Pause scanning when switching to other tabs to save resources
        html5QrCode.pause();
    }
}

// Function to add touch events for better mobile experience
function addTouchEvents() {
    // Add touch feedback to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.opacity = '0.7';
        });
        
        button.addEventListener('touchend', function() {
            this.style.opacity = '1';
        });
    });
}

// Function to start QR code scanning
function startScanning() {
    if (isScanning) return;
    
    // Switch to the scanner tab if not already there
    switchTab('scanner-section', document.querySelectorAll('.tab-button'));
    
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Process the scanned QR code
        processScannedQRCode(decodedText);
    };
    
    // Configure camera with better settings for mobile
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        // Only use formatsToSupport if Html5QrcodeSupportedFormats is available
        ...(typeof Html5QrcodeSupportedFormats !== 'undefined' ? 
            { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] } : {}),
        rememberLastUsedCamera: true
    };
    
    // Check if camera access is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported");
        alert("Camera access is not supported by your browser. Please use the manual entry option below.");
        return;
    }
    
    // First check if camera permission is available
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            // Stop the stream immediately, we just needed to check permission
            stream.getTracks().forEach(track => track.stop());
            
            // Now start the QR scanner
            startQRScanner(config, qrCodeSuccessCallback);
        })
        .catch(err => {
            console.error("Camera permission error:", err);
            if (err.name === 'NotAllowedError') {
                alert("Camera access was denied. Please allow camera access in your browser settings and try again.");
            } else if (err.name === 'NotFoundError') {
                alert("No camera found on your device. Please ensure your device has a working camera.");
            } else if (err.name === 'NotSupportedError') {
                alert("Your browser doesn't support camera access or it's restricted. Please try a different browser or use the manual entry option.");
            } else {
                alert("Camera error: " + err.message + ". Please use the manual entry option below.");
            }
        });
}

// Function to start the QR scanner after permissions are granted
function startQRScanner(config, qrCodeSuccessCallback) {
    // First try to get available cameras
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
            console.log("Available cameras:", devices);
            // Try different camera configurations
            const cameraConfigs = [
                { facingMode: "environment" }, // Back camera (preferred for most phones)
                { facingMode: "user" },       // Front camera as fallback
                true                          // Any camera as last resort
            ];
            
            // For iOS devices, try device ID approach first if available
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS && devices.length > 0) {
                // Try to use the back camera first if available (usually the second camera on iOS)
                const backCameraIndex = devices.length > 1 ? 1 : 0;
                tryWithDeviceId(devices[backCameraIndex].id);
            } else {
                // For other devices, try the standard approach
                tryCamera(0);
            }
        } else {
            alert("No cameras found on your device. Please use the manual entry option.");
        }
    }).catch(err => {
        console.error("Error getting cameras:", err);
        // Fall back to trying camera configs directly
        tryCamera(0);
    });
    
    // Function to try with specific device ID (useful for iOS)
    function tryWithDeviceId(deviceId) {
        html5QrCode.start(
            { deviceId: deviceId },
            config,
            qrCodeSuccessCallback
        ).then(() => {
            handleScanningStarted();
        }).catch((err) => {
            console.error("Error with device ID " + deviceId + ":", err);
            // Fall back to standard approach
            tryCamera(0);
        });
    }
    
    // Function to try different camera configurations
    function tryCamera(index) {
        // Try different camera configurations
        const cameraConfigs = [
            { facingMode: "environment" }, // Back camera (preferred for most phones)
            { facingMode: "user" },       // Front camera as fallback
            true                          // Any camera as last resort
        ];
        
        if (index >= cameraConfigs.length) {
            alert("Could not access any camera. Please check your device settings or use the manual entry option.");
            return;
        }
        
        html5QrCode.start(
            cameraConfigs[index],
            config,
            qrCodeSuccessCallback
        ).then(() => {
            handleScanningStarted();
        }).catch((err) => {
            console.error("Error with camera config " + index + ":", err);
            
            // Try the next camera configuration
            tryCamera(index + 1);
        });
    }
    
    // Common function to handle successful scanning start
    function handleScanningStarted() {
        isScanning = true;
        console.log("QR Code scanning started successfully");
        
        // Update UI
        document.getElementById('startScanBtn').disabled = true;
        document.getElementById('stopScanBtn').disabled = false;
        
        // Vibrate to indicate scanning started (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
}

// Function to stop QR code scanning
function stopScanning() {
    if (!isScanning) return;
    
    html5QrCode.stop().then(() => {
        isScanning = false;
        console.log("QR Code scanning stopped");
        
        // Update UI
        document.getElementById('startScanBtn').disabled = false;
        document.getElementById('stopScanBtn').disabled = true;
    }).catch((err) => {
        console.error("Error stopping QR Code scanner:", err);
    });
}

// Function to process manual QR code entry
function processManualQrCode() {
    const manualInput = document.getElementById('manualQrInput').value.trim();
    
    if (!manualInput) {
        alert('Please enter QR code data');
        return;
    }
    
    // Process the manually entered QR code data
    processScannedQRCode(manualInput);
    
    // Clear the input field
    document.getElementById('manualQrInput').value = '';
    
    // Provide feedback
    alert('QR code data processed successfully!');
}

// Function to process the scanned QR code
function processScannedQRCode(decodedText) {
    // Show a processing indicator
    const processingIndicator = document.createElement('div');
    processingIndicator.className = 'processing-indicator';
    processingIndicator.textContent = 'Processing QR code...';
    document.body.appendChild(processingIndicator);
    
    try {
        // Parse the JSON data from the QR code
        const qrData = JSON.parse(decodedText);
        
        // If UUID is missing, generate one
        if (!qrData.uuid) {
            qrData.uuid = uuid.v4();
            console.log("Generated UUID for QR code:", qrData.uuid);
        }
        
        // If date is missing, use current date
        if (!qrData.date) {
            const now = new Date();
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear();
            qrData.date = `${day}/${month}/${year}`;
            console.log("Generated date for QR code:", qrData.date);
        }
        
        // If type is missing, set it to 'Raw'
        if (!qrData.type) {
            qrData.type = "Raw";
            console.log("Set default type for QR code:", qrData.type);
        }
        
        // Validate that the QR code contains the required fields
        if (!qrData.supplier || !qrData.stockCode || !qrData.mass) {
            console.error("Invalid QR code data format:", qrData);
            alert("Invalid QR code format. Missing required fields (supplier, stockCode, or mass).");
            removeProcessingIndicator();
            return;
        }
        
        // Check if this item has already been scanned (using UUID)
        const isDuplicate = scannedItems.some(item => item.uuid === qrData.uuid);
        
        if (isDuplicate) {
            console.log("Item already scanned:", qrData);
            // Show a notification
            alert("This item has already been scanned.");
            removeProcessingIndicator();
            return;
        }
        
        // Add the item to the scanned items array
        scannedItems.push(qrData);
        
        // Add the item to the table
        addItemToTable(qrData);
        
        // Play a success sound or show a notification
        playSuccessSound();
        
        // Vibrate to indicate success (if supported)
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        // Update the count of scanned items
        updateScannedItemsCount();
        
        // Switch to the items tab to show the newly scanned item
        setTimeout(() => {
            switchTab('scanned-items-section', document.querySelectorAll('.tab-button'));
        }, 500);
        
        // Remove the processing indicator
        removeProcessingIndicator();
        
    } catch (error) {
        console.error("Error processing QR code:", error);
        
        // Provide a more detailed error message
        let errorMessage = "Invalid QR code format. ";
        
        // Check if it's a JSON parsing error
        if (error instanceof SyntaxError) {
            errorMessage += "The QR code does not contain valid JSON data. ";
        }
        
        errorMessage += "Please scan a QR code generated by the Raw Stock QR Code Generator.";
        alert(errorMessage);
        
        // Remove the processing indicator
        removeProcessingIndicator();
    }
}

// Function to remove the processing indicator
function removeProcessingIndicator() {
    const indicators = document.querySelectorAll('.processing-indicator');
    indicators.forEach(indicator => {
        indicator.remove();
    });
}

// Function to add a scanned item to the table
function addItemToTable(item) {
    const tbody = document.getElementById('scannedItemsBody');
    
    // Create a new row
    const row = document.createElement('tr');
    row.setAttribute('data-uuid', item.uuid);
    
    // Create the row HTML - simplified for mobile view
    row.innerHTML = `
        <td>${item.supplier}</td>
        <td>${item.stockCode}</td>
        <td>${item.mass} kg</td>
        <td>
            <button class="delete-btn" onclick="removeItem('${item.uuid}')">Remove</button>
        </td>
    `;
    
    // Add the row to the table
    tbody.appendChild(row);
}

// Function to remove an item from the scanned items
function removeItem(uuid) {
    // Remove from the array
    scannedItems = scannedItems.filter(item => item.uuid !== uuid);
    
    // Remove from the table
    const row = document.querySelector(`tr[data-uuid="${uuid}"]`);
    if (row) {
        row.remove();
    }
    
    // Update the count
    updateScannedItemsCount();
}

// Function to play a success sound
function playSuccessSound() {
    // Create a simple beep sound
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, 200);
}

// Function to update the count of scanned items
function updateScannedItemsCount() {
    // Update the counter element
    const counterElement = document.querySelector('.scanned-items-count');
    if (counterElement) {
        counterElement.textContent = `${scannedItems.length} items scanned`;
    }
    
    // Enable/disable the generate PDF button based on whether items are scanned
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    if (generatePdfBtn) {
        generatePdfBtn.disabled = scannedItems.length === 0;
        if (scannedItems.length === 0) {
            generatePdfBtn.classList.add('disabled');
        } else {
            generatePdfBtn.classList.remove('disabled');
        }
    }
}

// Function to generate the delivery note PDF
function generateDeliveryNote() {
    if (scannedItems.length === 0) {
        alert('Please scan at least one item before generating a delivery note.');
        return;
    }
    
    // Get the from and to locations
    const fromLocation = document.getElementById('fromLocation').value;
    const toLocation = document.getElementById('toLocation').value;
    
    // Update the PDF template with the data
    updatePDFTemplate(fromLocation, toLocation);
    
    // Generate the PDF
    generatePDF(fromLocation, toLocation);
    
    // Show the email section
    document.getElementById('emailSection').style.display = 'block';
}

// Function to update the PDF template with the data
function updatePDFTemplate(fromLocation, toLocation) {
    // Set the current date and time
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    document.getElementById('pdfDeliveryDate').textContent = `Date: ${formattedDate} Time: ${formattedTime}`;
    
    // Set the locations
    document.getElementById('pdfFromLocation').textContent = fromLocation;
    document.getElementById('pdfToLocation').textContent = toLocation;
    
    // Clear the items table
    const tbody = document.getElementById('pdfItemsBody');
    tbody.innerHTML = '';
    
    // Add the items to the table
    scannedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.supplier}</td>
            <td>${item.stockCode}</td>
            <td>${item.mass} kg</td>
            <td>${item.date}</td>
            <td>${item.type}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Calculate mass summary by stock code
    const summaryByStockCode = {};
    
    // Group and sum the masses by stock code
    scannedItems.forEach(item => {
        const stockCode = item.stockCode;
        const mass = parseFloat(item.mass) || 0; // Convert to number, default to 0 if NaN
        
        if (summaryByStockCode[stockCode]) {
            summaryByStockCode[stockCode] += mass;
        } else {
            summaryByStockCode[stockCode] = mass;
        }
    });
    
    // Clear the summary table
    const summaryTbody = document.getElementById('pdfSummaryBody');
    summaryTbody.innerHTML = '';
    
    // Add the summary to the table
    let grandTotal = 0;
    
    // Sort the stock codes alphabetically
    const sortedEntries = Object.entries(summaryByStockCode).sort((a, b) => {
        return a[0].localeCompare(b[0]); // Sort by stock code (a[0] and b[0])
    });
    
    sortedEntries.forEach(([stockCode, totalMass]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stockCode}</td>
            <td>${totalMass.toFixed(2)} kg</td>
        `;
        summaryTbody.appendChild(row);
        
        // Add to grand total
        grandTotal += totalMass;
    });
    
    // Add a grand total row
    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    totalRow.innerHTML = `
        <td><strong>TOTAL</strong></td>
        <td><strong>${grandTotal.toFixed(2)} kg</strong></td>
    `;
    summaryTbody.appendChild(totalRow);
}

// Function to generate the PDF
function generatePDF(fromLocation, toLocation) {
    const { jsPDF } = window.jspdf;
    
    // Show loading indicator
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const originalBtnText = generatePdfBtn.textContent;
    generatePdfBtn.textContent = 'Generating PDF...';
    generatePdfBtn.disabled = true;
    
    // Get the template element
    const template = document.getElementById('deliveryNoteTemplate');
    
    // Create a temporary container for the template
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);
    
    // Clone the template and add it to the temporary container
    const templateClone = template.cloneNode(true);
    templateClone.style.display = 'block';
    tempContainer.appendChild(templateClone);
    
    // Preload the logo image to ensure it's loaded before generating the PDF
    const logoImg = templateClone.querySelector('.pdf-logo');
    if (logoImg) {
        // Use a data URL for the logo to avoid CORS issues
        logoImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCAzMDAgNjAiPgogIDxzdHlsZT4KICAgIC5sb2dvLXRleHQgeyBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGZvbnQtd2VpZ2h0OiBib2xkOyB9CiAgICAucmUtdGV4dCB7IGZpbGw6ICMyNkI2QjA7IH0KICAgIC5wcm9wbGFzdC10ZXh0IHsgZmlsbDogIzIyMjIyMjsgfQogIDwvc3R5bGU+CiAgPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI2MCIgZmlsbD0id2hpdGUiLz4KICA8dGV4dCB4PSIxMCIgeT0iNDUiIGNsYXNzPSJsb2dvLXRleHQgcmUtdGV4dCIgZm9udC1zaXplPSI0MCI+UkU8L3RleHQ+CiAgPHRleHQgeD0iNzAiIHk9IjQ1IiBjbGFzcz0ibG9nby10ZXh0IHByb3BsYXN0LXRleHQiIGZvbnQtc2l6ZT0iNDAiPlBST1BMQVNUPC90ZXh0PgogIDxjaXJjbGUgY3g9IjI4MCIgY3k9IjE1IiByPSI4IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjIyMjIiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPHRleHQgeD0iMjc3IiB5PSIxOSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMjIyMjIyIj7CrjwvdGV4dD4KPC9zdmc+';
        console.log('Logo source updated to data URL');
    } else {
        console.error('Logo element not found in template');
    }
    
    // Create a new PDF document (A4 size)
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });
    
    // Add a small delay to ensure the logo is loaded
    console.log('Waiting for logo to load...');
    setTimeout(() => {
        // Convert the template to an image
        console.log('Starting html2canvas conversion...');
        html2canvas(templateClone.querySelector('.delivery-note-content'), {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            allowTaint: true, // Allow tainted canvas
            logging: true, // Enable logging for debugging
            backgroundColor: '#FFFFFF',
            imageTimeout: 5000, // Increase timeout for image loading
            onclone: function(clonedDoc) {
                console.log('Template cloned successfully');
                // Check if the logo is loaded in the cloned document
                const logoImg = clonedDoc.querySelector('.pdf-logo');
                if (logoImg) {
                    console.log('Logo found in cloned document');
                    // Force logo to load completely before rendering
                    logoImg.onload = function() {
                        console.log('Logo loaded successfully');
                    };
                    logoImg.onerror = function() {
                        console.error('Error loading logo in cloned document');
                    };
                } else {
                    console.error('Logo not found in cloned document');
                }
            }
        }).then(canvas => {
            console.log('html2canvas conversion successful');
            // Add the image to the PDF
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
            const imgWidth = canvasWidth * ratio;
            const imgHeight = canvasHeight * ratio;
            const marginX = (pdfWidth - imgWidth) / 2;
            
            pdf.addImage(imgData, 'JPEG', marginX, 0, imgWidth, imgHeight);
            
            // Generate a filename based on the locations and date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const filename = `Delivery_Note_${fromLocation}_to_${toLocation}_${dateStr}.pdf`;
            
            // Save the PDF
            pdf.save(filename);
            
            // Remove the temporary container
            document.body.removeChild(tempContainer);
            
            // Reset button state
            generatePdfBtn.textContent = originalBtnText;
            generatePdfBtn.disabled = false;
            
            // Show success message
            alert(`Delivery note PDF has been generated successfully.\n\nFilename: ${filename}`);
            
            // Vibrate to indicate success (if supported)
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 100]);
            }
        }).catch(error => {
            console.error('Error generating PDF:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            
            // Provide more specific error message to the user
            let errorMessage = 'Error generating PDF. Please try again.';
            if (error.message && error.message.includes('logo')) {
                errorMessage = 'Error loading logo image. Please check if the logo file exists and try again.';
            } else if (error.message && error.message.includes('html2canvas')) {
                errorMessage = 'Error converting template to image. Please try again with fewer items.';
            }
            
            alert(errorMessage);
            
            // Reset button state on error
            generatePdfBtn.textContent = originalBtnText;
            generatePdfBtn.disabled = false;
            
            // Remove the temporary container
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
        });
    }, 500); // Wait 500ms for logo to load
}

// Function to send the PDF via email
function sendEmail() {
    // Get email details from the form
    const emailTo = document.getElementById('emailTo').value;
    const emailSubject = document.getElementById('emailSubject').value;
    const emailMessage = document.getElementById('emailMessage').value;
    
    // Validate email address
    if (!emailTo) {
        alert('Please enter a recipient email address.');
        return;
    }
    
    // Validate email format using a simple regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTo)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Get the from and to locations for the email subject
    const fromLocation = document.getElementById('fromLocation').value;
    const toLocation = document.getElementById('toLocation').value;
    
    // If using EmailJS, uncomment and configure with your service details
    // For now, show a detailed alert with the email information
    alert(`Email details:\n\nTo: ${emailTo}\nSubject: ${emailSubject}\nFrom Location: ${fromLocation}\nTo Location: ${toLocation}\nItems: ${scannedItems.length}\n\nMessage: ${emailMessage}\n\nNote: To enable actual email sending, configure EmailJS or implement a server-side solution.`);
    
    // Example of how to use EmailJS (uncomment and configure with your service details)
    /*
    // Show loading indicator
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    sendEmailBtn.textContent = 'Sending...';
    sendEmailBtn.disabled = true;
    
    const templateParams = {
        to_email: emailTo,
        subject: emailSubject,
        message: emailMessage,
        from_location: fromLocation,
        to_location: toLocation,
        items_count: scannedItems.length,
        // You would need to attach the PDF here
    };
    
    emailjs.send('your_service_id', 'your_template_id', templateParams)
        .then(function(response) {
            console.log('Email sent!', response.status, response.text);
            alert('Email sent successfully!');
            sendEmailBtn.textContent = 'Send Email';
            sendEmailBtn.disabled = false;
        }, function(error) {
            console.error('Email error:', error);
            alert('Failed to send email. Please try again.');
            sendEmailBtn.textContent = 'Send Email';
            sendEmailBtn.disabled = false;
        });
    */
}