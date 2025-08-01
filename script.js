// Global variables
let scannedItems = [];
let scannerInitialized = false;
let lastScanTime = 0;
let html5QrCode;

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to current button and pane
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Stop scanner when switching tabs
            if (tabId !== 'scan' && html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop();
            }
        });
    });
    
    // Initialize QR Scanner
    const startScannerBtn = document.getElementById('start-scanner');
    const scanResult = document.getElementById('scan-result');
    
    startScannerBtn.addEventListener('click', () => {
        if (!scannerInitialized) {
            initializeScanner();
            startScannerBtn.textContent = 'Stop Scanner';
            scannerInitialized = true;
        } else {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop();
                startScannerBtn.textContent = 'Start Scanner';
                scannerInitialized = false;
            } else {
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: 250 },
                    onScanSuccess,
                    onScanFailure
                );
                startScannerBtn.textContent = 'Stop Scanner';
                scannerInitialized = true;
            }
        }
    });
    
    // Manual entry form
    const manualEntryForm = document.getElementById('manual-entry-form');
    
    manualEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const supplier = document.getElementById('supplier').value;
        const stockCode = document.getElementById('stockCode').value;
        const mass = document.getElementById('mass').value;
        const date = document.getElementById('date').value;
        const type = document.getElementById('type').value;
        const uuid = generateUUID(); // Generate a UUID for manual entries
        
        const newItem = {
            supplier,
            stockCode,
            mass: parseInt(mass),
            date,
            type,
            uuid
        };
        
        addItemToList(newItem);
        manualEntryForm.reset();
        
        // Show success message using the popup
        showPopupMessage(`Successfully added: ${stockCode}`, 'success');
        
        // Switch to list tab
        document.querySelector('[data-tab="list"]').click();
    });
    
    // Generate PDF button
    const generatePdfBtn = document.getElementById('generate-pdf');
    
    generatePdfBtn.addEventListener('click', () => {
        console.log('Generate PDF button clicked');
        if (scannedItems.length === 0) {
            alert('Please add at least one item to generate a delivery note.');
            return;
        }
        
        const dispatcher = document.getElementById('dispatcher').value;
        const receiver = document.getElementById('receiver').value;
        const from = document.getElementById('from').value;
        const to = document.getElementById('to').value;
        
        console.log('Dispatcher:', dispatcher);
        console.log('Receiver:', receiver);
        console.log('From:', from);
        console.log('To:', to);
        
        if (!dispatcher || !receiver) {
            alert('Please enter both dispatcher and receiver names.');
            return;
        }
        
        try {
            console.log('Calling generateDeliveryNotePDF');
            generateDeliveryNotePDF(dispatcher, receiver, from, to);
            console.log('PDF generation completed');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF: ' + error.message);
        }
    });
    
    // Set today's date as default for manual entry
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
});

// Initialize QR Scanner
function initializeScanner() {
    html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        onScanFailure
    );
}

// Handle successful QR scan
function onScanSuccess(decodedText, decodedResult) {
    const currentTime = new Date().getTime();
    const scanResultElement = document.getElementById('scan-result');
    
    // Check if 3 seconds have passed since the last scan
    if (currentTime - lastScanTime < 3000) {
        showPopupMessage('Please wait 3 seconds between scans', 'error');
        return;
    }
    
    lastScanTime = currentTime;
    
    try {
        // Parse the QR code data (expected format: JSON string)
        const scannedData = JSON.parse(decodedText);
        
        // Debug: Log the scanned data to console
        console.log('Scanned QR data:', scannedData);
        console.log('Date from QR:', scannedData.date, 'Type:', typeof scannedData.date);
        
        // Validate required fields
        if (!scannedData.supplier || !scannedData.stockCode || !scannedData.mass || 
            !scannedData.date || !scannedData.type || !scannedData.uuid) {
            throw new Error('Invalid QR code format. Missing required fields.');
        }
        
        // Check if this item has already been scanned
        const isDuplicate = scannedItems.some(item => item.uuid === scannedData.uuid);
        
        if (isDuplicate) {
            showPopupMessage('This item has already been scanned!', 'error');
        } else {
            // Ensure the date is in a format that can be parsed correctly
        // Store the date in its original format if it's already dd/mm/yyyy
        if (scannedData.date && typeof scannedData.date === 'string') {
            console.log('Original date from QR:', scannedData.date);
            
            // If it's in dd/mm/yyyy format, keep it as is
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(scannedData.date)) {
                // Validate the date parts
                const parts = scannedData.date.split('/');
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                // Ensure day and month are valid
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    // Keep the original dd/mm/yyyy format
                    console.log('Keeping original dd/mm/yyyy format:', scannedData.date);
                } else {
                    console.log('Invalid date parts in dd/mm/yyyy format');
                }
            }
            // If it's in ISO format (yyyy-mm-dd), keep it as is
            else if (/^\d{4}-\d{2}-\d{2}/.test(scannedData.date)) {
                console.log('Date is already in ISO format:', scannedData.date);
            }
        }
        
        // Add the scanned item to our list
        addItemToList(scannedData);
        showPopupMessage(`Successfully scanned: ${scannedData.stockCode}`, 'success');
        }
    } catch (error) {
        showPopupMessage(`Error: ${error.message}`, 'error');
    }
}

// Function to show popup messages
function showPopupMessage(message, type) {
    // Remove any existing popups
    const existingPopup = document.querySelector('.scan-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = `scan-popup ${type}`;
    
    // Add content based on type
    if (type === 'success') {
        popup.innerHTML = `
            <h3>Success!</h3>
            <p>${message}</p>
        `;
    } else {
        popup.innerHTML = `
            <h3>Alert</h3>
            <p>${message}</p>
        `;
    }
    
    // Add to document
    document.body.appendChild(popup);
    
    // Remove popup after animation completes
    setTimeout(() => {
        if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 3000);
}

// Handle QR scan failure
function onScanFailure(error) {
    // We don't need to show every scan failure
    console.error('QR code scan error:', error);
}

// Add item to the list
function addItemToList(item) {
    // Add to our array
    scannedItems.push(item);
    
    // Update the table
    updateItemsTable();
    
    // Update total mass
    updateTotalMass();
}

// Update the items table
function updateItemsTable() {
    const tableBody = document.querySelector('#items-table tbody');
    tableBody.innerHTML = '';
    
    scannedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Format the date for display
        const displayDate = formatDate(item.date);
        
        row.innerHTML = `
            <td>${item.supplier}</td>
            <td>${item.stockCode}</td>
            <td>${Math.round(item.mass)}</td>
            <td>${displayDate}</td>
            <td>${item.type}</td>
            <td><button class="delete-btn" data-index="${index}">Delete</button></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            const deletedItem = scannedItems[index];
            scannedItems.splice(index, 1);
            updateItemsTable();
            updateTotalMass();
            
            // Show deletion confirmation popup
            showPopupMessage(`Item ${deletedItem.stockCode} removed from list`, 'error');
        });
    });
}

// Update the total mass display
function updateTotalMass() {
    const totalMass = scannedItems.reduce((sum, item) => sum + Math.round(item.mass), 0);
    document.getElementById('total-mass').textContent = totalMass;
}

// Generate a UUID for manual entries
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Format date for display in dd/mm/yyyy format
function formatDate(dateString) {
    // Handle potential invalid date strings
    if (!dateString) return "Invalid date";
    
    // Debug: Log the input date string
    console.log('formatDate input:', dateString, 'Type:', typeof dateString);
    
    try {
        // Check if it's already in dd/mm/yyyy format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
            const parts = dateString.split('/');
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            
            // Validate the date parts
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                const formattedDay = day.toString().padStart(2, '0');
                const formattedMonth = (month + 1).toString().padStart(2, '0');
                return `${formattedDay}/${formattedMonth}/${year}`;
            }
        }
        
        // Try to parse as ISO date (yyyy-mm-dd)
        if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
            const [year, month, day] = dateString.split('T')[0].split('-').map(num => parseInt(num, 10));
            if (year && month && day) {
                const formattedDay = day.toString().padStart(2, '0');
                const formattedMonth = month.toString().padStart(2, '0');
                return `${formattedDay}/${formattedMonth}/${year}`;
            }
        }
        
        // As a last resort, try JavaScript's Date parsing
        // But be careful with the format interpretation
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        // Return the original string if we can't parse it
        return dateString;
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateString; // Return the original string on error
    }
}

// Generate PDF delivery note
function generateDeliveryNotePDF(dispatcher, receiver, from, to) {
    console.log('Starting PDF generation');
    try {
        // Try different ways to access jsPDF
        console.log('Trying to access jsPDF');
        let jsPDF;
        
        if (window.jspdf) {
            console.log('Found jsPDF in window.jspdf');
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            console.log('Found jsPDF in window.jsPDF');
            jsPDF = window.jsPDF;
        } else {
            console.error('jsPDF library not found in window object');
            throw new Error('jsPDF library not loaded correctly. Please check the console for more details.');
        }
        
        console.log('jsPDF accessed successfully:', jsPDF);
        
        // Create a new PDF document
        console.log('Creating new jsPDF document');
        const doc = new jsPDF();
        console.log('jsPDF document created successfully');
    
    // Calculate total mass for filename
    const totalMass = scannedItems.reduce((sum, item) => sum + Math.round(item.mass), 0);
    
    // Get current date for filename
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const dateString = `${day}-${month}-${year}`;
    const timeString = today.toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-');
    
    // Logo removed as requested
    
    // Continue with the PDF generation
    // Add title - moved up since logo was removed
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("Delivery Note", 105, 20, { align: "center" });
    
    // Add date and time
    doc.setFontSize(10);
    const formattedDate = formatDate(today.toISOString());
    const formattedTime = today.toLocaleTimeString();
    doc.text(`Date: ${formattedDate} Time: ${formattedTime}`, 105, 30, { align: "center" });
    
    // Add delivery information on the same line - moved up since logo was removed
    doc.setFontSize(12);
    doc.text(`From: ${from}`, 20, 40);
    doc.text(`To: ${to}`, 105, 40);
    
    // Add items table
    const tableColumn = ["Supplier", "Stock Code", "Mass (kg)", "Date", "Type"];
    const tableRows = [];
    
    scannedItems.forEach(item => {
        const itemData = [
            item.supplier,
            item.stockCode,
            Math.round(item.mass).toString() + " kg",
            formatDate(item.date),
            item.type
        ];
        tableRows.push(itemData);
    });
    
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 }
        },
        margin: { left: 20, right: 20 },
        didDrawPage: function(data) {
            // Ensure content fits on one page
            if (data.pageCount > 1) {
                doc.deletePage(2);
            }
        }
    });
    
    // Get the final Y position after the table
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Add summary table by stock code
    const summaryData = {};
    scannedItems.forEach(item => {
        if (!summaryData[item.stockCode]) {
            summaryData[item.stockCode] = 0;
        }
        summaryData[item.stockCode] += Math.round(item.mass);
    });
    
    const summaryColumn = ["Stock Code", "Total Mass (kg)"];
    const summaryRows = [];
    
    for (const [stockCode, mass] of Object.entries(summaryData)) {
        summaryRows.push([stockCode, mass.toString() + " kg"]);
    }
    
    doc.setFontSize(14);
    doc.text("Summary by Stock Code", 105, finalY, { align: "center" });
    
    doc.autoTable({
        head: [summaryColumn],
        body: summaryRows,
        startY: finalY + 5,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 80, halign: 'right' }
        },
        margin: { left: 20, right: 20 },
        willDrawPage: function(data) {
            // Ensure the summary table fits on the same page
            if (data.pageCount > 1) {
                // Reduce font size further if needed
                this.styles.fontSize = 8;
                this.styles.cellPadding = 1;
            }
        }
    });
    
    // Add total stock delivered in a box
    const summaryFinalY = doc.lastAutoTable.finalY + 20;
    
    // Draw a box for the total
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(50, summaryFinalY - 15, 110, 30, 3, 3, 'FD');
    
    // Add total mass with teal color for the value
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Total Stock Delivered", 105, summaryFinalY, { align: "center" });
    
    doc.setFontSize(18);
    doc.setTextColor(38, 182, 165); // Teal color
    doc.text(`${Math.round(totalMass)} kg`, 105, summaryFinalY + 10, { align: "center" });
    
    // Add dispatcher and receiver information at the bottom
    const signaturesY = summaryFinalY + 40;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Left side - Dispatcher
    doc.text("Dispatcher", 50, signaturesY);
    doc.setFont(undefined, 'normal');
    doc.text(dispatcher, 50, signaturesY + 10);
    
    // Right side - Receiver
    doc.setFont(undefined, 'normal');
    doc.text("Receiver", 150, signaturesY);
    doc.setFont(undefined, 'normal');
    doc.text(receiver, 150, signaturesY + 10);
    
    // Save the PDF
    const roundedTotalMass = Math.round(totalMass);
    console.log('Saving PDF with filename:', `Delivery_Note_${dateString}_${roundedTotalMass}kgs.pdf`);
    const filename = `Delivery_Note_${dateString}_${roundedTotalMass}kgs.pdf`;
    doc.save(filename);
    console.log('PDF saved successfully');
    } catch (error) {
        console.error('Error in PDF generation:', error);
        throw error;
    }
} // End of generateDeliveryNotePDF function