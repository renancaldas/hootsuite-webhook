
![Alt](https://www.vanhack.com/wp-content/uploads/2016/03/logo_blog.png "Title") 
#### VanHackathon 2016 



- Project: Webhooks
- Company: HootSuite
- Challenge link: http://app.vanhack.com/Challenges/Details?id=4
- Author: Renan Caldas de Oliveira (https://www.linkedin.com/in/renancaldas)


&nbsp;
#### Summary 
---

1. Tech stack

2. Description

3. Endpoints

4. Considerations

&nbsp;
#### 1. Tech stack
---
- MEAN (excluding AngularJS) 
    - NodeJS
    - Express 4
    - MongoDB


&nbsp;
#### 2. Description
---
This is a challenge proposed by [HootSuite](https://hootsuite.com/) for the [VanHackathon 2016](https://www.vanhack.com/hackathon/). The objective is to create a webhooks service that POSTs data to registered destinations. 

There are some observations:

- Destinations and messages are saved in a database (MongoDB).
- The message will be deleted automatically if:
    - it is not processed in 24 hours, by default;
    - or the destination could not process it after the 3rd retry.

- There are 2 jobs that run in the background for checking the rules above.

- There is a config file for setting the global variables:
    - **MongoDB Url (this must be defined in order to run the application)**
    - Application port
    - Invalid URLs
    - Request expiration time
    - Retry count
    - Cron time for run the jobs and the timezone


&nbsp;
#### 3. Endpoints
---
This is a summary with the endpoints and the required fields for each one:

- `GET` **/destination**
    - **Returns a list of destinations**
    
    
&nbsp;
- `POST`  **/destination**
    - **Creates a new destination**
    - Required header: "Content-Type": "application/json"
    - Required body: { "URL": "..." }
    - Validations: 
        - The URL should begin with "http://" or "https://"
        - The URL cannot be "localhost" or "127.0.0.1"
    - Returns the inserted destination id
    - 
&nbsp;
- `DELETE`  **/destination/:id**
    - **Deletes a destination**
    - Required params: Destination Id
    
&nbsp;
- `POST`  **/message/:destinationId**
    - **Sends a new message to the destination with the body and content-type**
    - Required params: Destination Id
    - Optional header: "Content-Type"
    - Body content is optional
    - Returns the destination's body and headers or, if could not process the request, a message saying that it will retry later.
    
    

&nbsp;
#### 4. Considerations
---
- The API is using just 3 (GET, POST, DELETE) of the REST-ful standard conventions. The PUT method was not used.

&nbsp;
- This application can be scaled out by running on different machines under a load balancer (AWS load balancer, Nginx), as explained in the video presentation.

&nbsp;
- NodeJS runs asynchronous code by default, so it can handle multiple concurrent requests while keeping the data in a database for a future usage. But, I created 2 cron jobs for checking the database periodically and removing the pending requests, without blocking the main process (client requests).

&nbsp;
- For better security: 
    - it could have an API key in the header's request, to block people without this key;
    - it could have a HTTPS connection, even if there are not passwords been passed;
    - Localhost and 127.0.0.1 are blocked by default, in the config file, so the user cannot send malicious requests to the server running the application.



