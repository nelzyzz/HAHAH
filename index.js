import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
const app = express();

// Replace with your Facebook Page Access Token
const PAGE_ACCESS_TOKEN = 'EAAZAla0AZCCdUBOxOCRwh9h7F5rWQFpmiK1Y9DZA7HDZAk0mtISmrGgwlqAS7avNoyMjYUddKeb7whZADudM1raKyJZBKLqTj9IRcWeYgPjCQCkD0eaVQBDwnswZCZA2t0ActM9Cx0tipNDm5FFqDVmKTzqboBw7zMPwAiBThkGfNcZAtxF7xIXMeF5RJyiJ94FGFmgMARNZCcnn0aFPRXxwZDZD';
// Replace with your Webhook Verification Token
const VERIFY_TOKEN = 'pagebot';

// Define a motto
const motto = "Your success starts with a single step.";

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Webhook verification (GET method)
app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403); // Forbidden
    }
});

// Webhook for receiving messages (POST method)
app.post('/webhook', async (req, res) => {
    const data = req.body;

    // Ensure this is from a page subscription
    if (data.object === 'page') {
        data.entry.forEach(entry => {
            const messagingEvents = entry.messaging;
            messagingEvents.forEach(async (event) => {
                const senderId = event.sender.id;

                if (event.message) {
                    if (event.message.text) {
                        const userMessage = event.message.text.trim();

                        // Check if the message is a question
                        if (userMessage.toLowerCase().includes('?')) {
                            // Call the GPT-4 API to get a response
                            const response = await getGpt4Response(userMessage);
                            sendTextMessage(senderId, response);
                        } else {
                            // Respond with a predefined message or motto
                            sendTextMessage(senderId, `Thanks for your message! Motto: "${motto}"`);
                        }
                    } else if (event.message.attachments) {
                        // Handle image attachments or other media
                        handleImageAttachment(senderId, event.message.attachments);
                    }
                }
            });
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Function to send a text message response
function sendTextMessage(senderId, messageText) {
    const messageData = {
        recipient: { id: senderId },
        message: { text: messageText }
    };

    // Sending message using Facebook's Send API
    callSendAPI(messageData);
}

// Function to handle image attachments
function handleImageAttachment(senderId, attachments) {
    attachments.forEach(attachment => {
        if (attachment.type === 'image') {
            const imageUrl = attachment.payload.url;

            // Send the image URL to an AI service or simply respond
            sendTextMessage(senderId, `I received your image: ${imageUrl}`);

            // You can integrate AI for image recognition here
            analyzeImage(imageUrl).then(response => {
                sendTextMessage(senderId, `Here's what I see in your image: ${response}`);
            });
        }
    });
}

// Function to send requests via Facebook Send API
function callSendAPI(messageData) {
    fetch(`https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error.message);
            // Handle the OAuthException specifically
            if (data.error.code === 190) {
                console.error("OAuth Exception: Invalid or expired token.");
            }
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
}

// AI-based Image Recognition (Optional - Using Google Vision API)
async function analyzeImage(imageUrl) {
    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=AIzaSyDA8aCJIwi3ZcCI6ZAI5CCxnCWvYIy4q9g`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { source: { imageUri: imageUrl } },
                    features: [{ type: 'LABEL_DETECTION', maxResults: 5 }]
                }]
            })
        });
        const result = await response.json();
        if (result.responses && result.responses[0] && result.responses[0].labelAnnotations) {
            const labels = result.responses[0].labelAnnotations;
            return labels.map(label => label.description).join(', ');
        } else {
            return 'Unable to analyze the image.';
        }
    } catch (error) {
        console.error('Error analyzing image:', error);
        return 'Unable to analyze the image.';
    }
}

// Function to get response from GPT-4 API
async function getGpt4Response(userMessage) {
    const apiUrl = `https://joshweb.click/api/gpt-4o?q=${encodeURIComponent(userMessage)}&uid=1234`; // Example UID
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data && data.answer) {
            return data.answer;
        } else {
            return 'Sorry, I couldn\'t find an answer for that.';
        }
    } catch (error) {
        console.error('Error calling GPT-4 API:', error);
        return 'There was an error processing your request.';
    }
}

// Start the Express server
app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running...');
});
