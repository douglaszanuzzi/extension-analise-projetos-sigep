console.log("Background iniciado.");

if (chrome.sidePanel) {

    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
    });

}
