// HTML templates for approval/rejection responses

export const successTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <title>User Approved</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .success-message {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      border-radius: 5px;
      margin-top: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      margin-bottom: 10px;
    }
    p {
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="success-message">
    <h1>Approval Successful</h1>
    <p>User has been approved.</p>
    <p>Their device is now activated and they can use the application.</p>
    <p>Thank you for your response.</p>
  </div>
</body>
</html>
`;

export const errorTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <title>Invalid Request</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .error-message {
      background-color: #f44336;
      color: white;
      padding: 20px;
      border-radius: 5px;
      margin-top: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      margin-bottom: 10px;
    }
    p {
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="error-message">
    <h1>Invalid Request</h1>
    <p>This link is invalid or has expired.</p>
    <p>Please contact the system administrator for assistance.</p>
  </div>
</body>
</html>
`;

export const rejectionTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <title>User Rejected</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .reject-message {
      background-color: #f44336;
      color: white;
      padding: 20px;
      border-radius: 5px;
      margin-top: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      margin-bottom: 10px;
    }
    p {
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="reject-message">
    <h1>User Rejected</h1>
    <p>User's device has been rejected.</p>
    <p>They will not be able to use the application with this device.</p>
    <p>Thank you for your response.</p>
  </div>
</body>
</html>
`;

export const previouslyUsedTemplate = () => `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Action Already Taken</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              text-align: center;
            }
            .info-message {
              background-color: #2196F3;
              color: white;
              padding: 20px;
              border-radius: 5px;
              margin-top: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              margin-bottom: 10px;
            }
            p {
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="info-message">
            <h1>Action Already Taken</h1>
            <p>This approval/rejection link has already been used.</p>
            <p>The user's status was previously set. </strong></p>
            <p>No further action is needed.</p>
          </div>
        </body>
        </html>
      `;