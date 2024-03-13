// ==UserScript==
// @name KMLI_AIB
// @namespace ns_KMLI_AIB
// @author P-a-d-r-a-i-g
// @version 2024.03.13.1
// @description Keeps login session alive in AIB online banking for 1 hour if the user wishes it.
// @match https://onlinebanking.aib.ie/inet/roi/*
// @exclude https://onlinebanking.aib.ie/inet/roi/timeout.htm
// @exclude https://onlinebanking.aib.ie/inet/roi/login.htm
// @exclude https://onlinebanking.aib.ie/inet/roi/logincancel.htm
// @grant none
// @homepage https://github.com/P-a-d-r-a-i-g/KMLI
// @downloadURL https://raw.githubusercontent.com/P-a-d-r-a-i-g/KMLI/main/KMLI_AIB.js
// @updateURL https://raw.githubusercontent.com/P-a-d-r-a-i-g/KMLI/main/KMLI_AIB.js
// ==/UserScript==

(function () {
    'use strict';

    let newPageConfirmTimeoutId;
    let keepMeLoggedInInterval; // To hold the keepMeLoggedIn reference
    let keepMeLoggedInIntervalTimeInSeconds = 60; // Execute the function every X seconds
    let askToStayLoggedInInterval; // To hold the askToStayLoggedInInterval reference
    let askToStayLoggedInIntervalTimeInSeconds = 60 * 60; // The time in seconds to ask the user if they want to continue staying logged in

    // Function to keep user logged in.
    function keepMeLoggedIn() {
        refreshSession();
    }

    // Function to set an item in localStorage with a specified expiration time in seconds
    function setLocalStorageWithExpiry(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl * 1000 // TTL in milliseconds
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    // Function to get an item from localStorage
    function getLocalStorageWithExpiry(key) {
        const itemString = localStorage.getItem(key);
        if (!itemString) {
            return null;
        }
        const item = JSON.parse(itemString);
        const now = new Date().getTime();
        if (now > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    }

    // Function to get an item expiry time from localStorage
    function getLocalStorageWithExpiryExpiryTime(key) {
        const itemString = localStorage.getItem(key);
        if (!itemString) {
            return null;
        }
        const item = JSON.parse(itemString);
        return item.expiry;
    }

    // Function to show a custom dialog
    function showCustomDialog(message, callback) {
        const dialogContainer = document.createElement('div');
        dialogContainer.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 40px; border: 3px solid #3498db; border-radius: 10px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.3); text-align: center; z-index: 9999;';
        const dialogMessage = document.createElement('p');
        dialogMessage.textContent = message;
        dialogMessage.style.fontSize = '24px';
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Yes';
        confirmButton.style.fontSize = '18px';
        confirmButton.style.padding = '10px 20px';
        confirmButton.style.marginRight = '20px';
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'No';
        cancelButton.style.fontSize = '18px';
        cancelButton.style.padding = '10px 20px';

        confirmButton.addEventListener('click', function () {
            document.body.removeChild(dialogContainer);
            callback(true);
        });

        cancelButton.addEventListener('click', function () {
            document.body.removeChild(dialogContainer);
            callback(false);
        });

        dialogContainer.appendChild(dialogMessage);
        dialogContainer.appendChild(document.createElement('br'));
        dialogContainer.appendChild(confirmButton);
        dialogContainer.appendChild(cancelButton);
        document.body.appendChild(dialogContainer);
    }

    function askTheUserFunction() {
        const keepUserLoggedInAnswer = getLocalStorageWithExpiry('keepUserLoggedInAnswer');

        if (keepUserLoggedInAnswer) {
            if (keepUserLoggedInAnswer === 'yup') {
                // Start calling keepMeLoggedIn every keepMeLoggedInIntervalTimeInSeconds seconds
                keepMeLoggedInInterval = setInterval(keepMeLoggedIn, keepMeLoggedInIntervalTimeInSeconds * 1000);
            }
            // since we have already confirmed, and we are probably on a new page too, so call this function a little after the confirmation expires
            if (!newPageConfirmTimeoutId) {
                newPageConfirmTimeoutId = setTimeout(askTheUserFunction, getLocalStorageWithExpiryExpiryTime('keepUserLoggedInAnswer') - Date.now() + (10 * 1000));
            }
            return;
        }

        // If keepMeLoggedInInterval interval is already running, clear it
        if (newPageConfirmTimeoutId) {
            clearTimeout(newPageConfirmTimeoutId);
            newPageConfirmTimeoutId = null;
        }

        // If keepMeLoggedInInterval interval is already running, clear it
        if (keepMeLoggedInInterval) {
            clearInterval(keepMeLoggedInInterval);
            keepMeLoggedInInterval = null;
        }

        // If askToStayLoggedInInterval interval is already running, clear it
        if (askToStayLoggedInInterval) {
            clearInterval(askToStayLoggedInInterval);
            askToStayLoggedInInterval = null;
        }

        showCustomDialog("Would you like to stay logged in for the next hour?", function (response) {
            if (response) {
                // Start calling keepMeLoggedIn every keepMeLoggedInIntervalTimeInSeconds seconds
                keepMeLoggedInInterval = setInterval(keepMeLoggedIn, keepMeLoggedInIntervalTimeInSeconds * 1000);
                setLocalStorageWithExpiry('keepUserLoggedInAnswer', 'yup', askToStayLoggedInIntervalTimeInSeconds);
            } else {
                setLocalStorageWithExpiry('keepUserLoggedInAnswer', 'nope', askToStayLoggedInIntervalTimeInSeconds);
            }
            askToStayLoggedInInterval = setInterval(askTheUserFunction, askToStayLoggedInIntervalTimeInSeconds * 1000); // 60 minutes
        });
    }
    
    function displayCountdownTimer() {
        const expiryTime = getLocalStorageWithExpiryExpiryTime('keepUserLoggedInAnswer');
        const countdownTimerElement = document.getElementById('countdown-timer');

        if (expiryTime && countdownTimerElement) {
            const now = Date.now();
            const timeRemaining = expiryTime - now;

            if (timeRemaining > 0) {
                const secondsRemaining = Math.ceil(timeRemaining / 1000);
                const hours = Math.floor(secondsRemaining / 3600);
                const minutes = Math.floor((secondsRemaining % 3600) / 60);
                const seconds = secondsRemaining % 60;

                const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                countdownTimerElement.textContent = formattedTime;
            } else {
                countdownTimerElement.textContent = 'Expired';
            }
        } else if (countdownTimerElement) {
            countdownTimerElement.textContent = 'Not set';
        }
    }

    function createCountdownTimerBox() {
        const countdownTimerBox = document.createElement('div');
        countdownTimerBox.id = 'countdown-timer-box';
        countdownTimerBox.style.position = 'fixed';
        countdownTimerBox.style.bottom = '20px';
        countdownTimerBox.style.right = '20px';
        countdownTimerBox.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        countdownTimerBox.style.padding = '10px 20px';
        countdownTimerBox.style.border = '1px solid #ccc';
        countdownTimerBox.style.borderRadius = '5px';
        countdownTimerBox.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        
        const countdownTimerLabel = document.createElement('span');
        countdownTimerLabel.textContent = 'KMLI:';
        
        const countdownTimer = document.createElement('span');
        countdownTimer.id = 'countdown-timer';
        
        countdownTimerBox.appendChild(countdownTimerLabel);
        countdownTimerBox.appendChild(countdownTimer);
        document.body.appendChild(countdownTimerBox);
    }

    // Create the countdown timer box
    createCountdownTimerBox();

    // Update the countdown timer every 1 second
    setInterval(displayCountdownTimer, 1000);

    // initial call
    setTimeout(askTheUserFunction, 1 * 1000);

})();
