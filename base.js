// This script dynamically sets the base URL for GitHub Pages
(function() {
    // Get the current hostname
    const hostname = window.location.hostname;
    
    // Check if we're on GitHub Pages (contains github.io)
    const isGitHubPages = hostname.includes('github.io');
    
    if (isGitHubPages) {
        // Extract the repository name from the pathname
        const pathSegments = window.location.pathname.split('/');
        // The first segment after the domain will be the repository name
        const repoName = pathSegments[1];
        
        // Only proceed if we have a repository name
        if (repoName) {
            // Create a base element or update existing one
            let baseElement = document.querySelector('base');
            
            if (!baseElement) {
                baseElement = document.createElement('base');
                document.head.appendChild(baseElement);
            }
            
            // Set the base href to include the repository name
            baseElement.href = `/${repoName}/`;
            
            console.log(`Base URL set to: ${baseElement.href}`);
        }
    }
})();