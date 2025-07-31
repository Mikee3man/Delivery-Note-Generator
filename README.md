# Delivery Note Generator

A mobile-friendly web application for generating delivery notes with QR code scanning capabilities. This application allows users to scan QR codes containing stock information or manually enter data, and then generate a PDF delivery note.

## Features

- QR code scanning for quick data entry
- Manual data entry option
- Prevention of duplicate QR code scans
- Configurable dispatch and receiving locations
- PDF generation with company branding
- Responsive design for mobile devices
- Summary tables by stock code
- Total mass calculations

## Usage Instructions

### QR Code Scanning

1. Open the application on your mobile device
2. Click on the "Scan QR" tab
3. Click "Start Scanner" to activate the camera
4. Point your camera at a QR code containing stock information
5. The application will automatically add the scanned item to your list
6. There is a 3-second delay between scans to prevent duplicates

### Manual Entry

1. Click on the "Manual Entry" tab
2. Fill in the required fields (Supplier, Stock Code, Mass, Date, Type)
3. Click "Add Entry" to add the item to your list

### Generating a Delivery Note

1. Click on the "View List" tab to see all added items
2. Select the "From" and "To" locations from the dropdown menus
3. Enter the Dispatcher and Receiver names
4. Review the items in the list
5. Click "Generate Delivery Note" to create a PDF
6. The PDF will be named "Delivery_Note_[Date]_[TotalMass]kgs.pdf"

## QR Code Format

The application expects QR codes to contain JSON data in the following format:

```json
{
  "supplier": "Supplier Name",
  "stockCode": "ABC123",
  "mass": 100,
  "date": "2023-05-15",
  "type": "Raw Material",
  "uuid": "unique-identifier-string"
}
```

## Deployment to GitHub Pages

To deploy this application to GitHub Pages:

1. Create a new GitHub repository
2. Upload all the files from this project to the repository
3. Go to the repository settings
4. Scroll down to the "GitHub Pages" section
5. Select the branch you want to deploy (usually "main")
6. Click "Save"
7. GitHub will provide you with a URL where your application is hosted

## Technical Details

This application uses the following technologies:

- HTML5, CSS3, and JavaScript
- [HTML5-QRCode](https://github.com/mebjas/html5-qrcode) for QR code scanning
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) for creating tables in PDFs

## Browser Compatibility

This application works best on modern browsers that support the MediaDevices API for camera access. For optimal performance, use the latest versions of:

- Chrome
- Firefox
- Safari
- Edge

## License

This project is proprietary and intended for internal use only.

## Support

For support or feature requests, please contact the development team.