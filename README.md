sip-server-node
===============

This is a simple B2BUA SIP server on Node.js platform. 

To run it, simply run the following in command line:

node SipServer.js

By default, SIP port for UDP is 5050.

In current version (early alpha):

- SIP protocol support is very basic at this time, it consists the processing of INVITE, CANCEL and BYE messages only, but will be enhanced soon;
- WebSocket protocol support should be tested.
