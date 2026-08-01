# Prompts

## 001 — 2026-08-01

under constants i want you to create an enum file and generate generic response message to be sent to the client over http for example Not found, bad request etc

## 002 — 2026-08-01

under exceptions folder, i need you create a base exception class then create exception class for regular http exception like not found bad request etc use the response message and response code you have create, i want you not note my coding style i want resonable variable name so someone should tell what a variable or function or class is by reading the name, i dont like big functions so we need to break things in small functions , also do not comment unless absolutely necessary

## 003 — 2026-08-01

under common folder i want you yo create na http response file and functions that both success response and error response in a uniform consistent manner

## 004 — 2026-08-01

create an app logger class to log information and error in a consistent manner, and set up winston as out universal logging library, set up winston i a way that we can easily change to something else in development logs can go to termnial thats fine in prod i can go to a file

## 005 — 2026-08-01

i need you to create a global error handler that catches all errors and send a consitent response to the client and does not leak unnecessary information

also 5xx error should be logged for debugging

## 006 — 2026-08-01

i want you to set up swagger for automatic api documentation
