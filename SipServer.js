/*
  The MIT License (MIT)

Copyright (c) 2014 Andrei Leontev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

var dgram = require('dgram');
var stream = require('net');
var websocket = require('websocket').server;
var http = require('http');

//// var sipsTrace = function() {};

var sipsTrace = function(traceInfo) {
	var date = new Date();

	console.log(date.getHours() + ':' + 
			date.getMinutes() + ':' + 
			date.getSeconds() + '.' + 
			date.getMilliseconds() + ' ' + 
			traceInfo);
};

// SIP entity settings
function sipSettings(localPort)
{	
	sipsTrace('-----------------------------------------------');
	sipsTrace('Configuration begin');
	this.localIpv4Address = '127.0.0.1';
	this.localIpv6Address = '::1';
/*
	this.localIpv4Address = '192.168.1.19';
	this.localIpv6Address = '2607:f0d0:2001:a::10';
 */
/*
	this.localIpv4Address = '192.168.1.20';
	this.localIpv6Address = '2607:f0d0:2001:a::20';
 */

	this.localUdpPort = localPort;
	this.localTcpPort = localPort;
	this.localWsPort = localPort + 30;
	
	sipsTrace('UDP local port is ' + this.localUdpPort);
	sipsTrace('TCP local port is ' + this.localTcpPort);
	sipsTrace('WS local port is ' + this.localWsPort);
	
	// proxy/server settings
	this.remoteIpv4Address = '127.0.0.1';
	this.remoteIpv6Address = '::1';
	this.remoteUdpPort = 5060;
	this.remoteTcpPort = 5060;
	this.remoteWsPort = 5090;
	
/*
	this.remoteIpv4Address = '192.168.1.19';
	this.remoteIpv6Address = '2607:f0d0:2001:a::10';
	this.remoteUdpPort = 11111;
	this.remoteTcpPort = 11111;
 */	
	
	this.protocol = TRANSPORT.TR_WS;
	this.enableIpv6 = false;
	
	// SIP protocol settings
	this.registerRefreshTimeout = 3600;
	this.MaxForwards = 70;
	
	// databases
	this.isStoreDatabaseUsed = true;
	this.isConfigDatabaseUsed = false;
	
	// cloud/cluster deployment
	this.nodeId = '12345abcdf';
	sipsTrace('Configuration end');
	sipsTrace('-----------------------------------------------');
}

//SIP stack version
var SIP_STACK_VERSION = '1.00.0030';

// supported SIP schemas
var sipScheme = 'sip';
var sipsScheme = 'sips';
var webSocketScheme = 'ws';
var webSocketSecureScheme = 'wss';

// supported SIP methods
var SIP_METHOD = {
	SM_ACK : 'ACK',	
	SM_REGISTER : 'REGISTER',
	SM_INVITE : 'INVITE',
	SM_BYE : 'BYE',
	SM_UPDATE : 'UPDATE',
	SM_NOTIFY : 'NOTIFY',
	SM_SUBSCRIBE : 'SUBSCRIBE',
	SM_REFER : 'REFER',
	SM_CANCEL : 'CANCEL'
};

// supported SIP headers
var SIP_HEADER = {
	// rfc 3261
	SH_ALLOW : 'Allow',
	SH_CALL_ID : 'Call-ID',
	SH_CONTACT : 'Contact',
	SH_CONTENT_LENGTH : 'Content-Length',
	SH_CONTENT_TYPE : 'Content-Type',
	SH_CSEQ : 'CSeq',
	SH_EXPIRES : 'Expires',
	SH_FROM : 'From',
	SH_MAX_FORWARDS : 'Max-Forwards',
	SH_TO : 'To',
	SH_USER_AGENT : 'User-Agent',
	SH_VIA : 'Via'
};

//supported SIP parameters
var SIP_PARAMETER = {
	// rfc 3261
	SP_TAG : 'tag',
	SP_RECEIVED : 'received',
	SP_TRANSPORT : 'transport',
	SP_BRANCH : 'branch'
};

// supported transports
var TRANSPORT ={
	TR_UDP:'UDP',
	TR_TCP:'TCP',
	TR_TLS:'TLS',
	TR_WS:'WS',
	TR_WSS:'WSS'
};

// timers
var SIP_TIMER ={
	// rfc3261 timers
	TIMER_A:0,
	TIMER_B:1,
	TIMER_C:2,
	TIMER_D:3,
	TIMER_E:4,
	TIMER_F:5,
	TIMER_G:6,
	TIMER_H:7,
	TIMER_I:8,
	TIMER_J:9,
	TIMER_K:10,
	// registration timeout
	TIMER_REGISTER:100
};


// SIP protocol-related defines
var SIP_PROTOCOL_VERSION_20 = 'SIP/2.0';

// SIP Via magic cookie
var SIP_VIA_BRANCH_MC = 'z9hG4bK';

// SIP stack status and error codes
var SIPST_STATUS = {
	    SIPSC_SUCCESS : 0,
	    SIPSC_URI_PARSER_ERROR : 1,
	    SIPSC_MESSAGE_WITHOUT_METHOD : 2,
	    SIPSC_INCORRECT_PROTOCOL_VERSION : 3,
	    SIPSC_MALFORMED_PACKET : 4,
	    SIPSC_MESSAGE_KEEPALIVE : 5,					// keep-alive SIP message
	    SIPSC_GENERIC_ERROR : 255
	};

// SIP Response Reasons
var SIP_STATUS_CODE = {
		SC_100: 100,
		SC_180: 180,	
		SC_181: 181,
		SC_182: 182,
		SC_183: 183,
		SC_200: 200,
		SC_300: 300,
		SC_301: 301,
		SC_302: 302,
		SC_305: 305,
		SC_380: 380,
		SC_400: 400,
		SC_401: 401,
		SC_402: 402,
		SC_403: 403,
		SC_404: 404,
		SC_405: 405,
		SC_406: 406,
		SC_407: 407,
		SC_408: 408,
		SC_410: 410,
		SC_413: 413,
		SC_414: 414,
		SC_415: 415,
		SC_416: 416,
		SC_420: 420,
		SC_421: 421,
		SC_423: 423,
		SC_480: 480,
		SC_481: 481,
		SC_482: 482,
		SC_483: 483,
		SC_484: 484,
		SC_485: 485,
		SC_486: 486,
		SC_487: 487,
		SC_488: 488,
		SC_491: 491,
		SC_493: 493,
		SC_500: 500,
		SC_501: 501,
		SC_502: 502,
		SC_503: 503,
		SC_504: 504,
		SC_505: 505,
		SC_513: 513,
		SC_600: 600,
		SC_603: 603,
		SC_604: 604,
		SC_699: 699
};

function getReasonPhrase(SIPST_STATUS) {
	switch(SIPST_STATUS) {
	case SIP_STATUS_CODE.SC_100: return 'Trying';
	case SIP_STATUS_CODE.SC_180: return 'Ringing';
	case SIP_STATUS_CODE.SC_181: return 'Call Is Being Forwarded';
	case SIP_STATUS_CODE.SC_182: return 'Queued';
	case SIP_STATUS_CODE.SC_183: return 'Session Progress';
	case SIP_STATUS_CODE.SC_200: return 'OK';
	case SIP_STATUS_CODE.SC_300: return 'Multiple Choices';
	case SIP_STATUS_CODE.SC_301: return 'Moved Permanently';
	case SIP_STATUS_CODE.SC_302: return 'Moved Temporarily';
	case SIP_STATUS_CODE.SC_305: return 'Use Proxy';
	case SIP_STATUS_CODE.SC_380: return 'Alternative Service';
	case SIP_STATUS_CODE.SC_400: return 'Bad Request';
	case SIP_STATUS_CODE.SC_401: return 'Unauthorized';
	case SIP_STATUS_CODE.SC_402: return 'Payment Required';
	case SIP_STATUS_CODE.SC_403: return 'Forbidden';
	case SIP_STATUS_CODE.SC_404: return 'Not Found';
	case SIP_STATUS_CODE.SC_405: return 'Method Not Allowed';
	case SIP_STATUS_CODE.SC_406: return 'Not Acceptable';
	case SIP_STATUS_CODE.SC_407: return 'Proxy Authentication Required ';
	case SIP_STATUS_CODE.SC_408: return 'Request Timeout';
	case SIP_STATUS_CODE.SC_410: return 'Gone';
	case SIP_STATUS_CODE.SC_413: return 'Request Entity Too Large';
	case SIP_STATUS_CODE.SC_414: return 'Request-URI Too Long';
	case SIP_STATUS_CODE.SC_415: return 'Unsupported Media Type';
	case SIP_STATUS_CODE.SC_416: return 'Unsupported URI Scheme';
	case SIP_STATUS_CODE.SC_420: return 'Bad Extension';
	case SIP_STATUS_CODE.SC_421: return 'Extension Required';
	case SIP_STATUS_CODE.SC_423: return 'Interval Too Brief';
	case SIP_STATUS_CODE.SC_480: return 'Temporarily Unavailable';
	case SIP_STATUS_CODE.SC_481: return 'Call/Transaction Does Not Exist';
	case SIP_STATUS_CODE.SC_482: return 'Loop Detected';
	case SIP_STATUS_CODE.SC_483: return 'Too Many Hops';
	case SIP_STATUS_CODE.SC_484: return 'Address Incomplete';
	case SIP_STATUS_CODE.SC_485: return 'Ambiguous';
	case SIP_STATUS_CODE.SC_486: return 'Busy Here';
	case SIP_STATUS_CODE.SC_487: return 'Request Terminated';
	case SIP_STATUS_CODE.SC_488: return 'Not Acceptable Here';
	case SIP_STATUS_CODE.SC_491: return 'Request Pending ';
	case SIP_STATUS_CODE.SC_493: return 'Undecipherable';
	case SIP_STATUS_CODE.SC_500: return 'Server Internal Error';
	case SIP_STATUS_CODE.SC_501: return 'Not Implemented';
	case SIP_STATUS_CODE.SC_502: return 'Bad Gateway';
	case SIP_STATUS_CODE.SC_503: return 'Service Unavailable';
	case SIP_STATUS_CODE.SC_504: return 'Server Time-out';
	case SIP_STATUS_CODE.SC_505: return 'Version Not Supported';
	case SIP_STATUS_CODE.SC_513: return 'Message Too Large';
	case SIP_STATUS_CODE.SC_600: return 'Busy Everywhere';
	case SIP_STATUS_CODE.SC_603: return 'Decline';
	case SIP_STATUS_CODE.SC_604: return 'Does Not Exist Anywhere';
	case SIP_STATUS_CODE.SC_699: return 'Max';
	default: return 'Unknown';
	};
};

// transaction's definitions
// INVITE-client transaction
var SIP_IC_TRANSACTION_STATE = {
		IC_TR_NULL: 0,
		IC_TR_CALLING: 1,
		IC_TR_PROCEEDING: 2,	
		IC_TR_COMPLETED: 3,
		IC_TR_TERMINATED: 4		
};

// INVITE-server transaction
var SIP_IS_TRANSACTION_STATE = {
		IS_TR_NULL: 0,
		IS_TR_PROCEEDING: 1,	
		IS_TR_COMPLETED: 2,
		IS_TR_CONFIRMED: 3,		
		IS_TR_TERMINATED: 4	
};

// non INVITE-client transaction
var SIP_NIC_TRANSACTION_STATE = {
		NIC_TR_NULL: 0,
		NIC_TR_TRYING:		1,
		NIC_TR_PROCEEDING:	2,	
		NIC_TR_COMPLETED:	3,
		NIC_TR_TERMINATED:	4		
};

// non INVITE-server transaction
var SIP_NIS_TRANSACTION_STATE = {
		NIS_TR_NULL: 0,
		NIS_TR_TRYING:		1,
		NIS_TR_PROCEEDING:	2,	
		NIS_TR_COMPLETED:	3,
		NIS_TR_TERMINATED:	4	
};

// main SIP stack
function sipStack() {
	if (arguments.callee._sipStackSingletonInstance)
		return arguments.callee._sipStackSingletonInstance;
	arguments.callee._sipStackSingletonInstance = this;
	// generate random data
	getRandomIdentifier = function() {
		return('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
				function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r
					: (r & 0x3 | 0x8);
			return v.toString(16).toUpperCase();
		}));
	};
	// generate random data
	getRawRandomIdentifier = function() {
		return('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g,
				function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r
					: (r & 0x3 | 0x8);
			return v.toString(16).toUpperCase();
		}));
	};
	// generate Call-Id
	var callId = getRandomIdentifier();
	var callIdCounter = 0;
	// generate Branch-Id
	var branchId = getRandomIdentifier();
	var branchIdCounter = 0;
	// generate From-tag
	var fromTag = getRandomIdentifier();
	var fromTagCounter = 0;
	// generate To-tag
	var toTag = getRandomIdentifier();
	var toTagCounter = 0;
	this.getCallId = function() {
		return callId + '-' + ++callIdCounter;
	};
	this.getBranchId = function() {
		return SIP_VIA_BRANCH_MC + branchId + '-' + ++branchIdCounter;
	};
	this.getFromTag = function() {
		return fromTag + '-' + ++fromTagCounter;
	};
	this.getToTag = function() {
		return toTag + '-' + ++toTagCounter;
	};	
	// generate global Call-Id
	var globalCallId = getRawRandomIdentifier();
	var globalCallIdCounter = 0;
	this.getGlobalCallId = function() {
		return 'GCID' + globalCallId + ++globalCallIdCounter;
	};	
	this.getStackVersion = function() {
		return 'ALE SIP stack ver. ' + SIP_STACK_VERSION;
	};
	this.getAllow = function() {
		return SIP_METHOD.SM_ACK + ', ' + SIP_METHOD.SM_BYE + ', ' + SIP_METHOD.SM_CANCEL + ', ' + SIP_METHOD.SM_INVITE;
	};
	// protocol timers
	var t1 = 500;
	var t2 = 4000;
	var t4 = 5000;

	this.getTimerValue = function(type, transport)
	{
		switch(type) {
		case SIP_TIMER.TIMER_A:
			return t1;
			break;
		case SIP_TIMER.TIMER_B:
			return 64*t1;
			break;
		case SIP_TIMER.TIMER_C:
			return 180000;	// > 3 min
			break;
		case SIP_TIMER.TIMER_D:
			if(transport === TRANSPORT.TR_UDP) {
				return 32000;	// > 32 sec
			} else {
				return 0;
			}
			break;
		case SIP_TIMER.TIMER_E:
			return t1;
			break;
		case SIP_TIMER.TIMER_F:
			return 64*t1;
			break;
		case SIP_TIMER.TIMER_G:
			return t1;
			break;
		case SIP_TIMER.TIMER_H:
			return 64*t1;
			break;
		case SIP_TIMER.TIMER_I:
			if(transport === TRANSPORT.TR_UDP) {
				return t4;
			} else {
				return 0;
			}
			break;
		case SIP_TIMER.TIMER_J:
			if(transport === TRANSPORT.TR_UDP) {
				return 64*t1;
			} else {
				return 0;
			}
			break;
		case SIP_TIMER.TIMER_K:
			if(transport === TRANSPORT.TR_UDP) {
				return t4;
			} else {
				return 0;
			}
			break;
		default:
			return 0;
			break;
		};
	};
}

// SIP parameter
function sipParameter(name, value) {
	var parameter = new Object();
	
	if(name !== undefined) {
		parameter.name = name;
	}
	if(value !== undefined) {
		parameter.value = value;
	}	
	parameter.parseString = function(inputString) {
		if (inputString) {
			var pos = inputString.indexOf('=');
			if (pos > -1) {
				this.name = inputString.substr(0, pos);
				this.value = inputString.substr(pos + 1, inputString.length);
			} else {
				this.name = inputString;
				this.value = '';
			}
		}
	};
	parameter.toString = function() {
		var sipParameterString = '';
		if (this.name) {
			sipParameterString += this.name;
			if (this.value) {
				sipParameterString += '=' + this.value;
			}
		}
		return sipParameterString;
	};
	return parameter;
};

// SIP header
function sipHeader(name, value) {
	return sipParameter(name, value);
}

// parameter's parser
function parseParameters(inputString, parsedParams)
{
	var pos1 = 0;
	var delimiter;
	var paramCounter = 0;
	
	while (inputString.length > 0) {
		delimiter = inputString.charAt(0);
		inputString = inputString.substr(1);
		pos1 = inputString.indexOf(';');
		if (pos1 === -1) {
			pos1 = inputString.indexOf('?');
			if (pos1 == -1) {
				pos1 = inputString.length;
			}
		}
		if (pos1 > 0) {
			if (delimiter === ';') {
				parsedParams[paramCounter] = new sipParameter();
				parsedParams[paramCounter].parseString(inputString
					.substr(0, pos1));
				paramCounter++;
			}
			if (delimiter === '?') {
				// parse header
			};
			inputString = inputString.substr(pos1);
		}
	}
}

function getParameterValue(params, name) {
	for (param in params) {
		if( params[param].name === name ) {
			return params[param].value;
		}
	}
}

// SIP URI
function sipUri() {
	this.scheme = null;
	this.user = null;
	this.password = null;
	this.host = null;
	this.port = 0;
	this.params = [];
	this.headers = [];
	this.noScheme = false;
	this.isIpv6 = false;

	// string to uri conversion
	this.parseString = function(inputString) {
		if (inputString) {
			// SIP scheme
			var pos = -1;
			if( this.noScheme === false ) {
				pos = inputString.indexOf(':');
				if (pos > -1) {
					var scheme = inputString.substr(0, pos);
					switch (scheme) {
					case sipScheme:
					case sipsScheme:
						this.scheme = scheme;
						break;
					default:
						return SIPST_STATUS.SIPSC_URI_PARSER_ERROR;
						break;
					}
				} else {
					return SIPST_STATUS.SIPSC_URI_PARSER_ERROR;
				}	
			}
			// user and password
			inputString = inputString.substr(pos + 1);
			pos = inputString.indexOf('@');
			var pos1 = inputString.indexOf(':');
			if (pos > -1) {
				if (pos1 > -1 && pos1 < pos) {
					this.user = inputString.substr(0, pos1);
					this.password = inputString
							.substr(pos1 + 1, pos - pos1 - 1);
				} else {
					this.user = inputString.substr(0, pos);
				}
			}
			// host
			inputString = inputString.substr(pos + 1);
			// verify if it is an IPv6 address
			var pos3 = inputString.indexOf('[');
			var pos4 = inputString.indexOf(']');
			if( (pos3 > -1) && (pos4 > -1) ) {
				this.isIpv6 = true;
				this.host = inputString.substring(pos3+1, pos4);
				inputString = inputString.substr(pos4 + 1);
			}			
			pos = inputString.indexOf(':');
			pos1 = inputString.indexOf(';');
			if (pos1 == -1) {
				pos1 = inputString.indexOf('?');
				if (pos1 == -1) {
					pos1 = inputString.length;
				}
			}
			var hostEndPos = -1;
			if (pos > -1) {
				hostEndPos = pos;
			} else if (pos1 > -1) {
				hostEndPos = pos1;
			}
			if (hostEndPos == -1) {
				return SIPST_STATUS.SIPSC_URI_PARSER_ERROR;
			}
			if(this.isIpv6 == false) {
				this.host = inputString.substr(0, hostEndPos);
			}
			// port
			var portEndPos = -1;
			if (pos > -1) {
				if (pos1 > -1) {
					portEndPos = pos1;
				} else {
					portEndPos = inputString.length;
				}
				this.port = parseInt(inputString.substr(pos + 1, portEndPos - pos - 1));
				inputString = inputString.substr(portEndPos);
			} else {
				inputString = inputString.substr(hostEndPos);
			}
			var delimiter = '';
			var paramCounter = 0;
			// parameters and headers
			while (inputString.length > 0) {
				delimiter = inputString.charAt(0);
				inputString = inputString.substr(1);
				pos1 = inputString.indexOf(';');
				if (pos1 == -1) {
					pos1 = inputString.indexOf('?');
					if (pos1 == -1) {
						pos1 = inputString.length;
					}
				}
				if (pos1 > 0) {
					if (delimiter === ';') {
						this.params[paramCounter] = new sipParameter();
						this.params[paramCounter].parseString(inputString
								.substr(0, pos1));
						paramCounter++;
					}
					if (delimiter === '?') {
						// parse header
					}
					;
					inputString = inputString.substr(pos1);
				}
			}
		}
	};

	// uri -> string conversion
	this.toString = function() {
		var sipUriString = '';
		if (this.scheme == null) {
			this.scheme = sipScheme;
		}
		if (this.noScheme != true) {
			sipUriString += this.scheme;
			sipUriString += ':';
		}
		if (this.user) {
			sipUriString += this.user;
			if (this.password) {
				sipUriString += ':' + this.password;
			}
			if (this.host) {
				sipUriString += '@';
			}
		}
		if (this.host) {
			if(this.isIpv6)
				sipUriString += '[';
			sipUriString += this.host;
			if(this.isIpv6)
				sipUriString += ']';
		}
		if (this.port > 0) {
			sipUriString += ':' + this.port;
		}
		for (param in this.params) {
			sipUriString += ';' + this.params[param].toString();
		}
		for (header in this.headers) {
			sipUriString += '?' + this.headers[header].toString();
		}
		return sipUriString;
	};
}

exports.sipUri = sipUri;
exports.sipParameter = sipParameter;
exports.sipHeader = sipParameter;
exports.SIPST_STATUS = SIPST_STATUS;

// Contact header
function sipContactHeader()
{
	this.uri = new sipUri();
	this.displayName = '';	
	this.params = [];
	this.headers = [];
	
	// string to uri conversion
	this.parseString = function(inputString) {
		if (inputString) {
			var lBraketPos = inputString.indexOf('<');
			var rBraketPos = inputString.indexOf('>');
			if( (lBraketPos !== -1) && (rBraketPos !== -1) && (rBraketPos > lBraketPos) ) {
				// parse SIP uri
				this.uri.parseString(inputString.substring(lBraketPos + 1, rBraketPos));
				// parse parameters
			}
			else {
				this.uri.parseString(inputString);
			}
		}
	};
	this.toString = function() {
		var sipContactString = SIP_HEADER.SH_CONTACT + ': ' + 
		(this.displayName? ('\"'+ this.displayName + '\"'+ ' '):'') +
		'<' + this.uri + '>';
		for (param in this.params) {
			sipContactString += ';' + this.params[param].toString();
		}
		for (header in this.headers) {
			sipContactString += '?' + this.headers[header].toString();
		}
		return sipContactString;
	};
}

// Via header
function sipViaHeader()
{
	this.trasport = TRANSPORT.TR_UDP;
	this.uri = new sipUri();
	this.params = [];
	
	// string to uri conversion
	this.parseString = function(inputString) {
		if (inputString) {
			var backspacePos = inputString.indexOf(' ');
			if( backspacePos !== -1 ) {
				var slashPos = inputString.indexOf('/');
				if( slashPos !== -1 && slashPos < backspacePos) {
					var protocol = inputString.substring(0, slashPos);
				} else {
					return;
				}
				var slashPos1 = inputString.indexOf('/', slashPos + 1);
				if( slashPos1 !== -1 && slashPos1 < backspacePos) {
					var version = inputString.substring(slashPos + 1, slashPos1);
				} else {
					return;
				}	
				this.trasport = inputString.substring(slashPos1 + 1, backspacePos);	
				if( ( backspacePos + 1 )  !== inputString.length ) {
					this.uri.noScheme = true;
					this.uri.parseString(inputString.substring(backspacePos+1, inputString.length));
				}
			}
		}
	};
	this.toString = function() {
		var sipViaString = SIP_HEADER.SH_VIA + ': ' + SIP_PROTOCOL_VERSION_20 + '/' + 
		this.trasport + ' ' + this.uri;
		for (param in this.params) {
			sipViaString += ';' + this.params[param].toString();
		}
		return sipViaString;
	};
}

// SDP
//
// SDP attribute
function sdpAttribute(name, value) {
	var attribute = new Object();
	
	if(name !== undefined) {
		attribute.name = name;
	}
	if(value !== undefined) {
		attribute.value = value;
	}	

	attribute.parseString = function(inputString) {
		if (inputString) {
			var pos = inputString.indexOf('=');
			if (pos > -1) {
				this.name = inputString.substr(0, pos);
				this.value = inputString.substr(pos + 1, inputString.length);
			} else {
				this.name = inputString;
				this.value = '';
			}
		}
	};
	// attribute -> string conversion
	attribute.toString = function() {
		var sipAttributeString = '';
		if (this.name) {
			sipAttributeString += this.name;
			if (this.value) {
				sipAttributeString += '=' + this.value;
			}
		}
		return sipAttributeString;
	};
	return attribute;
};

// SDP main object
function sdpContent(type) {
	var contentType = type;
	this.sdpAttribute = [];
	
	// SDP object -> string
	this.toString = function() {
		var sdpString = '';
		
		for (var i in this.sdpAttribute) {
			sdpString += this.sdpAttribute[i].name + '=' + this.sdpAttribute[i].value + '\r\n';
		}
		return sdpString;
	};
	// add SDP attribute
	this.addSdpAttribute = function(attributeString) {
		var attribute = new sdpAttribute();
		attribute.parseString(attributeString);
		this.sdpAttribute.push(attribute);
	};
	// get SDP content type
	this.getContentType = function() {
		return contentType;
	};
};

// SIP message
function sipMessage() {
	this.headers = [];
	this.extraHeaders = [];
	
	this.version = '';
	// for request
	this.method = '';				
	this.requestUri = new sipUri();
	// for response
	this.statusCode = -1;
	// standard headers
	// From
	this.fromUri = new sipUri();
	this.fromDisplayName = '';
	this.fromParams = [];
	// To
	this.toUri = new sipUri();	
	this.toDisplayName = '';
	this.toParams = [];
	// Call-ID
	this.callIdValue = '';
	// CSeq
	this.cSeq = 1;
	this.cSeqMethod = '';
	// Contact
	this.contactHeader = [];
	// Content-Length
	this.contentLength = 0;
	// Content-Type
	this.contentType = '';
	// Expires
	this.expiresValue = -1;
	// Via
	this.viaHeader = [];
	// Max-Forwards
	this.maxForwards = 0;
	// User-Agent
	this.userAgent = '';
	// Allow
	this.allow = '';

	// SDP
	this.contentType = '';
	var sdp;
	
	// message -> string conversion
	this.toString = function() {
		var message = '';
		
		// version 2.0 is supported by default
		this.version = SIP_PROTOCOL_VERSION_20;
		
		// Request-line for request and Status-line for responses
		if(this.statusCode != -1) {
			message += this.version + ' ' + 
				this.statusCode + ' ' + getReasonPhrase(this.statusCode) + '\r\n';	
		} else if( this.method ) {
			message += this.method + ' ' + 
				this.requestUri + ' ' + this.version + '\r\n';		
			} else {	
				return message;
		}
		// From header
		message += SIP_HEADER.SH_FROM + ': ' + 
			(this.fromDisplayName? ('\"'+ this.fromDisplayName + '\"'+ ' '):'') +
					'<' + this.fromUri + '>';
		for (var param in this.fromParams) {
			message += ';' + this.fromParams[param];
		}
		message += '\r\n';	
		// To header
		message += SIP_HEADER.SH_TO + ': ' + 
			(this.toDisplayName? ('\"'+ this.toDisplayName + '\"'+ ' '):'') +
					'<' + this.toUri + '>';
		for (var param in this.toParams) {
			message += ';' + this.toParams[param];
		}		
		message += '\r\n';	
		// Call-Id header
		message += SIP_HEADER.SH_CALL_ID + ': ' + this.callIdValue + '\r\n';
		// Contact header
		var contactLength = this.contactHeader.length;
	    for (var i = (contactLength - 1); i >= 0; i--) {
	    	message += this.contactHeader[i] + '\r\n';
	    }
		// Via header
		var viaLength = this.viaHeader.length;
	    for (var i = (viaLength - 1); i >= 0; i--) {
	    	message += this.viaHeader[i] + '\r\n';
	    }
		// CSeq header
		message += SIP_HEADER.SH_CSEQ + ': ' + this.cSeq + ' ' + this.method + '\r\n';	
		// Expires header
		if( this.expiresValue != -1 ) {
			message += SIP_HEADER.SH_EXPIRES + ': ' + this.expiresValue + '\r\n';
		}
		// Allow header
		if( this.allow.length > 0 ) {
			message += SIP_HEADER.SH_ALLOW + ': ' + this.allow + '\r\n';
		}
		// User-Agent header
		if( this.userAgent.length > 0 ) {
			message += SIP_HEADER.SH_USER_AGENT + ': ' + this.userAgent + '\r\n';
		}
		// Max-Forwards header
		if( this.maxForwards > 0 ) {
			message += SIP_HEADER.SH_MAX_FORWARDS + ': ' + this.maxForwards + '\r\n';
		}		
		
		// add headers
		for (var i in this.headers) {
			message += this.headers[i].name + ': ' + this.headers[i].value + '\r\n';
		}	
		// add extra headers
		for (var i in this.extraHeaders) {
			message += this.extraHeaders[i].name + ': ' + this.extraHeaders[i].value + '\r\n';
		}		
		if(sdp !== undefined) {
			var newSdp = sdp.toString();
			message += SIP_HEADER.SH_CONTENT_TYPE + ': ' + sdp.getContentType()  + '\r\n';
			message += SIP_HEADER.SH_CONTENT_LENGTH + ': ' + newSdp.length  + '\r\n';
			// end of SIP content
			message += '\r\n';
			
			message += newSdp;
		} else {
			this.contentLength = 0;
			message += SIP_HEADER.SH_CONTENT_LENGTH + ': ' + this.contentLength  + '\r\n';
			message += '\r\n';
		}	
		return message;
	};
	
	// string -> message convertion
	this.parseString = function(inputString) {
		var pos = 0;
		var isCrcn = false;
		var lineNumber = 0;
		var eol = inputString.indexOf("\r\n", pos);
		
		while( eol !== -1 ) {
			// get message line
			var messageLine = inputString.substring(pos, eol);
			// main parsing
			if(lineNumber === 0) {
				// try to take a method or version/status code
				var spIndex = messageLine.indexOf(' ');
				if(spIndex === -1) {
					if( messageLine === '') {
						// 
						sipsTrace('sip keep-alive is received');
						return SIPST_STATUS.SIPSC_MESSAGE_KEEPALIVE;
					} else {
						return SIPST_STATUS.SIPSC_MESSAGE_WITHOUT_METHOD;
					}
				}
					
				var firstWord = messageLine.substring(0, spIndex);
				switch(firstWord)
				{
				case SIP_METHOD.SM_REGISTER:
				case SIP_METHOD.SM_INVITE:
				case SIP_METHOD.SM_ACK:
				case SIP_METHOD.SM_BYE:
				case SIP_METHOD.SM_CANCEL:					
					this.method = firstWord;
					var spNextIndex = messageLine.indexOf(' ', spIndex + 1);
					if(spNextIndex === -1)
						return SIPST_STATUS.SIPSC_MESSAGE_WITHOUT_METHOD;
					this.requestUri.parseString(messageLine.substring(spIndex + 1, spNextIndex));
					if(messageLine.substring(spNextIndex + 1, 
							messageLine.length ) === SIP_PROTOCOL_VERSION_20) {
					}
					else {
						return SIPST_STATUS.SIPSC_INCORRECT_PROTOCOL_VERSION;
					}
					break;
				case SIP_PROTOCOL_VERSION_20:
					// SIP response
					var spNextIndex = messageLine.indexOf(' ', spIndex + 1);
					var statusCodeNumber;
					if(spNextIndex === -1) {
						statusCodeNumber = messageLine.substring(spIndex + 1, messageLine.length);
					} else {
						statusCodeNumber = messageLine.substring(spIndex + 1, spNextIndex);
					}
					this.statusCode = parseInt(statusCodeNumber, 10);
					break;
				default:
					// malformed/unsupported message
					return SIPST_STATUS.SIPSC_MALFORMED_PACKET;
					break;
				};	
			} else {
				var dpIndex = messageLine.indexOf(':');
				var headerName = messageLine.substring(0, dpIndex);
				var headerValue = messageLine.substring(dpIndex + 2, messageLine.length);
				if(isCrcn) {
					if(messageLine.length == 0) {
						isCrcn = true;
					} else {
						if( isCrcn && (messageLine.indexOf('=') == 1) ) {
							// SDP processing
							if( sdp !== undefined ) {
								sdp.addSdpAttribute(messageLine);
							}		
						}							
					}
				}
				else if(dpIndex === -1) {
					if(messageLine.length == 0) {
						isCrcn = true;
						// create SDP object, if content type is exist
						if( this.contentType.length > 0 ) {
							sdp = new sdpContent(this.contentType);
						}	
					}
				} else {
					switch(headerName) {
					case SIP_HEADER.SH_FROM:
						var lBraketPos = headerValue.indexOf('<');
						var rBraketPos = headerValue.indexOf('>');
						if( lBraketPos > 0 ) {
							var lSqPos = headerValue.indexOf('\"');
							var rSqPos = headerValue.indexOf('\"', lSqPos+1);
							if( (lSqPos !== -1) && (rSqPos !== -1) && (rSqPos > lSqPos) ) {
								this.fromDisplayName = headerValue.substring(lSqPos+1 , rSqPos);
							}
						}
						if( (lBraketPos !== -1) && (rBraketPos !== -1) && (rBraketPos > lBraketPos) ) {
							// parse SIP uri
							this.fromUri.parseString(headerValue.substring(lBraketPos+1 , rBraketPos));
							// parse parameters
							parseParameters(headerValue.substr(rBraketPos, headerValue.length), this.fromParams);
						}
						else {
							this.fromUri.parseString(headerValue);
						}
						break;
					case SIP_HEADER.SH_TO:
						var lBraketPos = headerValue.indexOf('<');
						var rBraketPos = headerValue.indexOf('>');
						if( lBraketPos > 0 ) {
							var lSqPos = headerValue.indexOf('\"');
							var rSqPos = headerValue.indexOf('\"', lSqPos+1);
							if( (lSqPos !== -1) && (rSqPos !== -1) && (rSqPos > lSqPos) ) {
								this.toDisplayName = headerValue.substring(lSqPos+1 , rSqPos);
							}
						}
						if( (lBraketPos !== -1) && (rBraketPos !== -1) && (rBraketPos > lBraketPos) ) {
							// parse SIP uri
							this.toUri.parseString(headerValue.substring(lBraketPos+1 , rBraketPos));
							// parse parameters
							parseParameters(headerValue.substr(rBraketPos, headerValue.length), this.toParams);
						}
						else {
							this.toUri.parseString(headerValue);
						}
						break;
					case SIP_HEADER.SH_CSEQ:
						var lBraketPos = headerValue.indexOf(' ');
						if(lBraketPos !== -1) {
							this.cSeq = parseInt(headerValue.substr(0 , lBraketPos));
							this.cSeqMethod = headerValue.substr(lBraketPos + 1, headerValue.length);
						}
						break;
					case SIP_HEADER.SH_VIA:
						var sipViaHeaderTmp = new sipViaHeader();
						sipViaHeaderTmp.parseString(headerValue);
						this.viaHeader.push(sipViaHeaderTmp);
						break;
					case SIP_HEADER.SH_CALL_ID:
						this.callIdValue = headerValue;
						break;
					case SIP_HEADER.SH_CONTACT:
						var sipContactHeaderTmp = new sipContactHeader();
						sipContactHeaderTmp.parseString(headerValue);
						this.contactHeader.push(sipContactHeaderTmp);
						break;
					case SIP_HEADER.SH_CONTENT_TYPE:
						this.contentType = headerValue;
						break;
					case SIP_HEADER.SH_CONTENT_LENGTH:
						// TODO
						break;
					case SIP_HEADER.SH_EXPIRES:
						this.expiresValue = parseInt(headerValue);
						break;
					case SIP_HEADER.SH_MAX_FORWARDS:
						this.maxForwards = parseInt(headerValue);
						break;
					case SIP_HEADER.SH_USER_AGENT:
						this.userAgent = headerValue;
						break;
					default:
						this.addExtraHeader(headerName, headerValue);
						break;
					};
				}
			}	
			// find next message line
			pos = eol + 2;
			eol = inputString.indexOf("\r\n",pos);
			lineNumber++;
		}
		return SIPST_STATUS.SIPSC_SUCCESS;
	};
		
	// add header
	this.addHeader = function(headerName, headerValue) {
		this.headers[this.headers.length]={name:headerName, value:headerValue};
	};
	// get first header with a given
	this.getFirstHeader = function(name) {
		
	};
	// get all headers with a given name
	this.getHeaders = function(name) {
		
	};	
	// add extra header
	this.addExtraHeader = function(headerName, headerValue) {
		this.extraHeaders[this.extraHeaders.length]={name:headerName, value:headerValue};
	};
	// add SDP
	this.addSdp = function(existingSdpContent) {
		if(existingSdpContent !== undefined) {
			
			if(typeof existingSdpContent == "string") {
				sdp = new sdpContent('application/sdp');
				
				var pos = 0;
				var eol = existingSdpContent.indexOf("\r\n", pos);
				
				while( eol !== -1 ) {
					// get message line
					var messageLine = existingSdpContent.substring(pos, eol);
					if( messageLine.indexOf('=') == 1 ) {
						// SDP processing
						if( sdp !== undefined ) {
							sdp.addSdpAttribute(messageLine);
						}		
					}		
					// find next message line
					pos = eol + 2;
					eol = existingSdpContent.indexOf("\r\n",pos);
				}
			} else {
				sdp = new sdpContent(existingSdpContent.getContentType());
				for (var i in existingSdpContent.sdpAttribute) {
					var attribute = existingSdpContent.sdpAttribute[i];
					sdp.sdpAttribute.push(attribute);
				}	
			}
		} else {
			sipsTrace('flush sdp');
			// sdp.sdpAttribute = [];
		}	
	};
	// get SDP
	this.getSdp = function() {
		return sdp;
	};
	// get first header with a given name
	this.getFirstExtraHeader = function(name) {
		
	};
	// get all headers with a given name
	this.getExtraHeaders = function(name) {
		
	};
}

// SIP messages factory
function createSipRequest(method) {
	var request = new sipMessage();
	request.method = method;
	return request;
}

function createSipResponse(status, method) {
	var response = new sipMessage();
	response.method = method;
	response.statusCode = status;
	return response;
}

function sipTransaction() {
	this.branch = '';
	this.fromTag = '';
	this.toTag = '';
	this.state = 0;
	this.callId = '';
	this.seqNumber = 1;
	this.method = '';
}

function sipInviteServerTransaction(method, stack, localTransport, remoteTransport) {
	this.transaction = new sipTransaction();
	this.transaction.method = method;
	this.message;
	this.remoteMessage;
	
	this.localTransport = localTransport;
	this.remoteTransport = remoteTransport;

	this.init = function(callId, fromTag, toTag, cSeq) {
		// transaction initialization
		if( callId !== undefined ) {
			this.transaction.callId = callId;
		} else {
			this.transaction.callId = '';
		}
		if( fromTag !== undefined ) {
			this.transaction.fromTag = fromTag;
		} else {
			this.transaction.fromTag = stack.getFromTag();
		}
		if( toTag !== undefined ) {
			this.transaction.toTag = toTag;
		} else {
			this.transaction.toTag = stack.getToTag();
		}
		if( cSeq !== undefined ) {
			this.transaction.seqNumber = cSeq;
		} else {
			this.transaction.seqNumber = 1;
		}
		this.transaction.branch = '';
	};

	this.createRequest = function(method, calledUser, sdp, sdpType) {	
		// no operation
		sipsTrace('sipInviteServerTransaction.createRequest - no operation');
		return;
	};	

	this.receiveRequest = function(remoteMessage) {	
		// store message
		this.remoteMessage = remoteMessage;
		// update transaction parameters
		this.transaction.branch = getParameterValue(this.remoteMessage.fromParams, SIP_PARAMETER.SP_BRANCH);
		this.transaction.fromTag = getParameterValue(this.remoteMessage.fromParams, SIP_PARAMETER.SP_TAG);
		var toTag = getParameterValue(this.remoteMessage.toParams, SIP_PARAMETER.SP_TAG);
		if( toTag !== undefined ) {
			this.transaction.toTag = getParameterValue(this.remoteMessage.toParams, SIP_PARAMETER.SP_TAG);
		}	
		this.transaction.callId = this.remoteMessage.callIdValue;
		this.transaction.seqNumber = this.remoteMessage.cSeq;
		// change transaction state
		this.transaction.state = SIP_IS_TRANSACTION_STATE.IS_TR_PROCEEDING;
		return;
	};	
	
	this.createResponse = function(status, sdp, sdpType) {
		
		switch(this.transaction.state) {
		case SIP_IS_TRANSACTION_STATE.IS_TR_PROCEEDING:
			if(( status >= SIP_STATUS_CODE.SC_100 ) && ( status < SIP_STATUS_CODE.SC_200 )) {
				this.transaction.state = SIP_IS_TRANSACTION_STATE.IS_TR_PROCEEDING;
			};
			if(( status >= SIP_STATUS_CODE.SC_200 ) && ( status < SIP_STATUS_CODE.SC_300 )) {
				this.transaction.state = SIP_IS_TRANSACTION_STATE.IS_TR_TERMINATED;
			};
			if(( status >= SIP_STATUS_CODE.SC_300 ) && ( status <= SIP_STATUS_CODE.SC_699 )) {
				this.transaction.state = SIP_IS_TRANSACTION_STATE.IS_TR_COMPLETED;
			};
			break;
		case SIP_IS_TRANSACTION_STATE.IS_TR_COMPLETED:
			return;
		case SIP_IS_TRANSACTION_STATE.IS_TR_CONFIRMED:
			return;
		case SIP_IS_TRANSACTION_STATE.IS_TR_TERMINATED:
			return;
			default:
				break;
		};
		
		// fill up response
		this.message = new createSipResponse(status, this.transaction.method);
		
		this.message.fromUri = this.remoteMessage.fromUri;
		this.message.fromDisplayName = this.remoteMessage.fromDisplayName;
		this.message.fromParams = this.remoteMessage.fromParams;
		
		this.message.toUri = this.remoteMessage.toUri;
		this.message.toDisplayName = this.remoteMessage.toDisplayName;			
		
		this.message.toParams.push(new sipParameter(SIP_PARAMETER.SP_TAG, this.transaction.toTag));
		
		this.message.cSeq = this.remoteMessage.cSeq;
		
		this.message.callIdValue = this.remoteMessage.callIdValue;
		
		var contact = new sipContactHeader();	
		contact.uri.port = this.localTransport.port;
		contact.uri.host = this.localTransport.host;
		contact.uri.isIpv6 = this.localTransport.isIpv6;
		
		switch(this.localTransport.protocol) {
		case TRANSPORT.TR_UDP:
			break;
		case TRANSPORT.TR_TCP:
			contact.uri.params.push(sipParameter(SIP_PARAMETER.SP_TRANSPORT,'tcp'));
			break;
		case TRANSPORT.TR_WS:
			contact.uri.params.push(sipParameter(SIP_PARAMETER.SP_TRANSPORT,'ws'));
			break;
		};
		this.message.contactHeader.push(contact);
		
		this.message.viaHeader = this.remoteMessage.viaHeader;
		
		this.message.userAgent = stack.getStackVersion();
		
		this.message.allow = stack.getAllow();
		// add SDP
		if(sdp != undefined) {
			this.message.addSdp(sdp, sdpType);
		}
	};
	
	this.receiveResponse = function(remoteMessage) {
		sipsTrace('sipInviteServerTransaction.receiveResponse - no operation');
	};
	
	this.timerHandler = function(timerType)
	{
		switch(timerType) {
		default:
			break;
		};
	};
}

function sipInviteClientTransaction(method, stack, localTransport, remoteTransport, send, remove) {
	this.transaction = new sipTransaction();
	this.transaction.method = method;
	this.message;
	this.remoteMessage;
	this.localTransport = localTransport;
	this.remoteTransport = remoteTransport;

	// timers
	var timerA;
	var timerB;
	var timerD;
	
	var timerACounter = 1;
	
	this.init = function(callId, fromTag, toTag, cSeq, branchId) {
		// transaction initialization
		if( callId !== undefined ) {
			this.transaction.callId = callId;
		} else {
			this.transaction.callId = stack.getCallId();
		}
		if( fromTag !== undefined ) {
			this.transaction.fromTag = fromTag;
		} else {
			this.transaction.fromTag = stack.getFromTag();
		}
		if( toTag !== undefined ) {
			this.transaction.toTag = toTag;
		} else {
			this.transaction.toTag = '';
		}
		if( cSeq !== undefined ) {
			this.transaction.seqNumber = cSeq;
		} else {
			this.transaction.seqNumber = 1;
		}
		if( branchId !== undefined ) {
			this.transaction.branch = branchId;
		} else {
			this.transaction.branch = stack.getBranchId();
		}
		this.transaction.branch = stack.getBranchId();
		this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_NULL;
	};

	this.createRequest = function(method, calledUser, sdp, sdpType) {
		// TODO to refactor this if
		switch(method) {
		case SIP_METHOD.SM_ACK:
			// get a new branch id
			this.transaction.branch = stack.getBranchId();
			this.message = createSipRequest(method);
			this.transaction.method = method;
			break;
		case SIP_METHOD.SM_INVITE:
		default:
			this.message = createSipRequest(SIP_METHOD.SM_INVITE);
			this.transaction.method = method;
			// update transaction state
			this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_CALLING;
			break;
		};
		// request-uri
		this.message.requestUri.user = calledUser;
		this.message.requestUri.host = remoteTransport.host;
		this.message.requestUri.port = remoteTransport.port;
		this.message.requestUri.isIpv6 = remoteTransport.isIpv6;		
		// via
		var via = new sipViaHeader();
		via.uri.noScheme = true;
		via.uri.port = this.localTransport.port;
		via.uri.host = this.localTransport.host;
		via.trasport = this.localTransport.protocol;
		via.uri.isIpv6 = this.localTransport.isIpv6;
		via.uri.params[0] = new sipParameter(SIP_PARAMETER.SP_BRANCH, this.transaction.branch);
		this.message.viaHeader.push(via);
		// from
		this.message.fromUri.host = this.localTransport.host;
		this.message.fromUri.port = this.localTransport.port;
		this.message.fromUri.isIpv6 = this.remoteTransport.isIpv6;
		this.message.fromParams.push(new sipParameter(SIP_PARAMETER.SP_TAG, this.transaction.fromTag));
		// to
		this.message.toUri.user = calledUser;
		this.message.toUri.host = this.remoteTransport.host;
		this.message.toUri.port = this.remoteTransport.port;
		this.message.toUri.isIpv6 = this.remoteTransport.isIpv6;

		if(this.transaction.toTag && (method !== SIP_METHOD.SM_CANCEL)) {
			this.message.toParams.push(new sipParameter(SIP_PARAMETER.SP_TAG, this.transaction.toTag));
		}
		// call-id
		this.message.callIdValue = this.transaction.callId;
		// contact
		var contact = new sipContactHeader();	
		contact.uri.port = this.localTransport.port;
		contact.uri.host = this.localTransport.host;
		contact.uri.isIpv6 = this.localTransport.isIpv6;
		switch(this.localTransport.protocol) {
		case TRANSPORT.TR_UDP:
			// start timers
			// TODO to remove this if
			if(method === SIP_METHOD.SM_INVITE) {
			timerA = setTimeout(timerHandler, 
					stack.getTimerValue(SIP_TIMER.TIMER_A, TRANSPORT.TR_UDP), SIP_TIMER.TIMER_A, this);
			}
			break;
		case TRANSPORT.TR_TCP:
			contact.uri.params.push(sipParameter(SIP_PARAMETER.SP_TRANSPORT,'tcp'));
			break;
		case TRANSPORT.TR_WS:
			contact.uri.params.push(sipParameter(SIP_PARAMETER.SP_TRANSPORT,'ws'));
			break;
		};
		timerD = setTimeout(timerHandler, 
				stack.getTimerValue(SIP_TIMER.TIMER_D, TRANSPORT.TR_UDP), SIP_TIMER.TIMER_D, this);
		
		this.message.contactHeader.push(contact);
		// cseq	
		this.message.cSeq = this.transaction.seqNumber;
		// user-agent
		this.message.userAgent = stack.getStackVersion();
		
		this.message.allow = stack.getAllow();
		// sdp
		if(sdp != undefined) {
			this.message.addSdp(sdp, sdpType);
		}
		//
		return;
	};

	var timerHandler = function(timerType, transaction) {
		switch(timerType) {
		case SIP_TIMER.TIMER_A:
			sipsTrace('timer A is fired');
			if( transaction.transaction.state == SIP_IC_TRANSACTION_STATE.IC_TR_CALLING ) {
				if( timerACounter <= 8 ) {
					timerACounter += 1;
					sipsTrace('calling state - message retransmission');
					send(transaction, transaction.remoteTransport);
					timerA = setTimeout(timerHandler, 
							( stack.getTimerValue(SIP_TIMER.TIMER_A, TRANSPORT.TR_UDP) * timerACounter), 
							SIP_TIMER.TIMER_A, transaction);
					// resend a message
				} else {
					sipsTrace('no more timer A retransmissions');
				}	
			}
			break;
		case SIP_TIMER.TIMER_B:
			sipsTrace('timer B is fired');
			remove(transaction);
			break;
		case SIP_TIMER.TIMER_D:
			sipsTrace('timer D is fired');
			remove(transaction);
			break;
		};
	};
	
	this.receiveRequest = function(remoteMessage) {
		sipsTrace('sipInviteClientTransaction.receiveRequest - no operation');
	};

	this.createResponse = function(status, sdp, sdpType) {
		sipsTrace('sipInviteClientTransaction.createResponse - no operation');
	};
	
	this.receiveResponse = function(remoteMessage) {	
		this.remoteMessage = remoteMessage;
		this.transaction.toTag = getParameterValue(this.remoteMessage.toParams, SIP_PARAMETER.SP_TAG);

		// stop timer A
		if( timerA !== undefined ) {
			clearTimeout(timerA);
			timerACounter = 1;
		}
		
		switch(this.transaction.state)
		{
			case SIP_IC_TRANSACTION_STATE.IC_TR_NULL:
				// no op - wrong state
				break;
			case SIP_IC_TRANSACTION_STATE.IC_TR_CALLING:
				// state change
				if( remoteMessage.statusCode < SIP_STATUS_CODE.SC_200 ) {
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_PROCEEDING;
				} else if ( remoteMessage.statusCode < SIP_STATUS_CODE.SC_300 ) {
					// stop timer 
					if( timerB !== undefined ) {
						clearTimeout(timerB);
					}
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_TERMINATED;
				} else if( remoteMessage.statusCode < SIP_STATUS_CODE.SC_699 ) {
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_COMPLETED;
				} else {
					sipsTrace('wrong message status');
				}
				break;
			case SIP_IC_TRANSACTION_STATE.IC_TR_PROCEEDING:
				// state change
				if( remoteMessage.statusCode < SIP_STATUS_CODE.SC_200 ) {
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_PROCEEDING;
				} else if ( remoteMessage.statusCode < SIP_STATUS_CODE.SC_300 ) {
					// stop timer 
					if( timerB !== undefined ) {
						clearTimeout(timerB);
					}
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_TERMINATED;
				} else if( remoteMessage.statusCode < SIP_STATUS_CODE.SC_699 ) {
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_COMPLETED;
				} else {
					sipsTrace('wrong message status');
				}
				break;
			case SIP_IC_TRANSACTION_STATE.IC_TR_COMPLETED:
				// state change
				if( ( remoteMessage.statusCode >= SIP_STATUS_CODE.SC_300 ) && 
						( remoteMessage.statusCode <  SIP_STATUS_CODE.SC_699 ) ) {
					this.transaction.state = SIP_IC_TRANSACTION_STATE.IC_TR_COMPLETED;
				} else {
					sipsTrace('wrong message status/state');
				}
				break;
			case SIP_IC_TRANSACTION_STATE.IC_TR_TERMINATED:		
				break;
			default:
				break;
		};
	};
}

function sipNonInviteServerTransaction(method, stack, localTransport, remoteTransport) {
	this.transaction = new sipTransaction();

	this.transaction.method = method;
	this.message;
	this.remoteMessage;
	
	this.localTransport = localTransport; 
	this.remoteTransport = remoteTransport; 

	this.init = function(callId, fromTag, toTag, cSeq) {
		// transaction initialization
		this.transaction.toTag = stack.getToTag();
		if( callId !== undefined ) {
			this.transaction.callId = callId;
		} else {
			this.transaction.callId = '';
		}
		if( fromTag !== undefined ) {
			this.transaction.fromTag = fromTag;
		} else {
			this.transaction.fromTag = '';
		}
		if( toTag !== undefined ) {
			this.transaction.toTag = toTag;
		} else {
			this.transaction.toTag = stack.getToTag();
		}
		if( cSeq !== undefined ) {
			this.transaction.seqNumber = cSeq;
		} else {
			this.transaction.seqNumber = 1;
		}
		this.transaction.branch = '';
		this.transaction.state = SIP_NIS_TRANSACTION_STATE.NIS_NULL;
	};
	
	this.createRequest = function(method, calledUser, sdp, sdpType) {
		sipsTrace('sipNonInviteServerTransaction.createRequest - no operation');
		// no operation
		return;
	};	

	this.receiveRequest = function(remoteMessage) {	
		// store message
		this.remoteMessage = remoteMessage;
		// update transaction parameters
		this.transaction.branch = getParameterValue(this.remoteMessage.fromParams, SIP_PARAMETER.SP_BRANCH);
		this.transaction.fromTag = getParameterValue(this.remoteMessage.fromParams, SIP_PARAMETER.SP_TAG);
		var toTag = getParameterValue(this.remoteMessage.toParams, SIP_PARAMETER.SP_TAG);
		if( toTag !== undefined ) {
			this.transaction.toTag = getParameterValue(this.remoteMessage.toParams, SIP_PARAMETER.SP_TAG);
		}	
		this.transaction.callId = this.remoteMessage.callIdValue;
		this.transaction.seqNumber = this.remoteMessage.cSeq;
		// change transaction state
		this.transaction.state = SIP_NIS_TRANSACTION_STATE.NIS_TR_TRYING;	
		return;
	};		
	
	this.createResponse = function(status, sdp, sdpType) {
		switch(this.transaction.state) {
		case SIP_NIS_TRANSACTION_STATE.NIS_TR_TRYING:
			if(( status >= SIP_STATUS_CODE.SC_100 ) && ( status <= SIP_STATUS_CODE.SC_699 )) {
				if( status >= SIP_STATUS_CODE.SC_200 ) {
					this.transaction.state = SIP_NIS_TRANSACTION_STATE.NIS_TR_COMPLETED;
				} else {
					this.transaction.state = SIP_NIS_TRANSACTION_STATE.NIS_TR_PROCEEDING;
				}
			}
			else {
				return;
			}
			break;
		case SIP_NIS_TRANSACTION_STATE.NIS_TR_PROCEEDING:
			if(( status >= SIP_STATUS_CODE.SC_100 ) && ( status <= SIP_STATUS_CODE.SC_699 )) {
				if( status >= SIP_STATUS_CODE.SC_200 ) {
					this.transaction.state = SIP_NIS_TRANSACTION_STATE.NIS_TR_COMPLETED;
				} else {
					this.transaction.state = SIP_NIS_TRANSACTION_STATE.NIS_TR_PROCEEDING;
				}
			}
			else {
				return;
			}
			break;
		case SIP_NIS_TRANSACTION_STATE.NIS_TR_COMPLETED:
			break;
		case SIP_NIS_TRANSACTION_STATE.NIS_TR_TERMINATED:
			break;
			default:
				break;
		};		
		
		// fill up response
		this.message = new createSipResponse(status, this.transaction.method);
		
		this.message.fromUri = this.remoteMessage.fromUri;
		this.message.fromDisplayName = this.remoteMessage.fromDisplayName;
		this.message.fromParams = this.remoteMessage.fromParams;
		
		this.message.toUri = this.remoteMessage.toUri;
		this.message.toDisplayName = this.remoteMessage.toDisplayName;			
		
		this.message.toParams.push(new sipParameter(SIP_PARAMETER.SP_TAG, this.transaction.toTag));
		
		this.message.cSeq = this.remoteMessage.cSeq;
		
		this.message.callIdValue = this.remoteMessage.callIdValue;
		
		this.message.contactHeader = this.remoteMessage.contactHeader;
		
		this.message.viaHeader = this.remoteMessage.viaHeader;
		
		this.message.userAgent = stack.getStackVersion();
		// add SDP
		if(sdp != undefined) {
			this.message.addSdp(sdp, sdpType);
		}
	};	
	
	this.receiveResponse = function(remoteMessage) {
		sipsTrace('sipNonInviteServerTransaction.receiveResponse - no operation');
		// no operation
		return;
	};	
	
	this.timerHandler = function(timerType)
	{
		switch(timerType) {
		default:
			break;
		};
	};
}

function sipNonInviteClientTransaction(method, stack, localTransport, remoteTransport) {
	this.transaction = new sipTransaction();
	this.transaction.method = method;
	this.message = createSipRequest(method);
	this.remoteMessage;
	this.localTransport = localTransport;
	this.remoteTransport = remoteTransport;

	this.init = function(callId, fromTag, toTag, cSeq, branchId) {
		// transaction initialization
		this.transaction.toTag = stack.getToTag();
		if( callId !== undefined ) {
			this.transaction.callId = callId;
		} else {
			this.transaction.callId = stack.getCallId();
		}
		if( fromTag !== undefined ) {
			this.transaction.fromTag = fromTag;
		} else {
			this.transaction.fromTag = stack.getFromTag();
		}
		if( toTag !== undefined ) {
			this.transaction.toTag = toTag;
		} else {
			this.transaction.toTag = '';
		}
		if( cSeq !== undefined ) {
			this.transaction.seqNumber = cSeq;
		} else {
			this.transaction.seqNumber = 1;
		}
		if( branchId !== undefined ) {
			this.transaction.branch = branchId;
		} else {
			this.transaction.branch = stack.getBranchId();
		}
		
		this.transaction.state = SIP_NIC_TRANSACTION_STATE.IC_NULL;
	};	
	
	// this.start = function(context) {
	this.createRequest = function(calledUser, sdp, sdpType) {			
		// request-uri
		this.message.requestUri.host = remoteTransport.host;
		this.message.requestUri.port = remoteTransport.port;
		this.message.requestUri.isIpv6 = remoteTransport.isIpv6;	
		// via
		var via = new sipViaHeader();
		via.uri.noScheme = true;
		via.uri.port = localTransport.port;
		via.uri.host = localTransport.host;
		via.trasport = localTransport.protocol;
		via.uri.isIpv6 = localTransport.isIpv6;
		via.uri.params[0] = new sipParameter(SIP_PARAMETER.SP_BRANCH, this.transaction.branch);
		this.message.viaHeader.push(via);
		// from
		this.message.fromUri.user = calledUser;
		this.message.fromUri.host = remoteTransport.host;
		this.message.fromUri.port = remoteTransport.port;
		this.message.fromUri.isIpv6 = remoteTransport.isIpv6;
		this.message.fromParams.push(new sipParameter(SIP_PARAMETER.SP_TAG, this.transaction.fromTag));
		// to
		this.message.toUri.user = calledUser;
		this.message.toUri.host = remoteTransport.host;
		this.message.toUri.port = remoteTransport.port;
		this.message.toUri.isIpv6 = remoteTransport.isIpv6;
		if(this.transaction.toTag) {
			this.message.toParams.push(new sipParameter(SIP_PARAMETER.SP_TAG, this.transaction.toTag));
		}
		// call-id
		this.message.callIdValue = this.transaction.callId;
		// contact
		var contact = new sipContactHeader();	
		contact.uri.port = localTransport.port;
		contact.uri.host = localTransport.host;
		contact.uri.isIpv6 = localTransport.isIpv6;
		switch(localTransport.protocol) {
		case TRANSPORT.TR_UDP:
			break;
		case TRANSPORT.TR_TCP:
			contact.uri.params.push(sipParameter(SIP_PARAMETER.SP_TRANSPORT,'tcp'));
			break;
		case TRANSPORT.TR_WS:
			contact.uri.params.push(sipParameter(SIP_PARAMETER.SP_TRANSPORT,'ws'));
			break;
		};
		this.message.contactHeader.push(contact);
		// cseq	
		this.message.cSeq = this.transaction.seqNumber;
		// user-agent
		this.message.userAgent = stack.getStackVersion();
		return this.message;
	};

	this.receiveRequest = function(remoteMessage) {
		sipsTrace('sipNonInviteClientTransaction.receiveRequest - no operation');
	};
	
	this.createResponse = function(status, sdp, sdpType) {
		sipsTrace('sipNonInviteClientTransaction.createResponse - no operation');
	};
	
	this.receiveResponse = function(remoteMessage) {	
		this.remoteMessage = remoteMessage;
		// this.transaction.state = SIP_IS_TRANSACTION_STATE.IS_TR_PROCEEDING;
	};	
}

function sipTransactionStorage() {
	var transactionStorage = [];
	this.addTransaction = function(transaction) {
		transactionStorage.push(transaction);
	};
	
	this.findTransaction = function(receivedMessage) {
		var count = transactionStorage.length;
		
		var callId = receivedMessage.callIdValue;
		var method = receivedMessage.method? receivedMessage.method:receivedMessage.cSeqMethod; 
		var cSeq = receivedMessage.cSeq;
		
		// TODO - little hack - to rework
		if(method == SIP_METHOD.SM_ACK) {
			method = SIP_METHOD.SM_INVITE;
		}
		
		// TODO - refactor - to speed up
		for (var i=0; i<count; i++) {
			//sipsTrace('transaction number ' + i);
			//sipsTrace('searched callId is ' + callId);
			//sipsTrace('current callId is ' + transactionStorage[i].transaction.callId);
			//sipsTrace('searched method is ' + method);
			//sipsTrace('current method is ' + transactionStorage[i].transaction.method);
			//sipsTrace('searched cSeq is ' + cSeq);
			//sipsTrace('current cSeq is ' + transactionStorage[i].transaction.seqNumber);
			var transactionTmp = transactionStorage[i];
			
			if( (callId == transactionTmp.transaction.callId)  &&
				(method == transactionTmp.transaction.method) &&
				(cSeq == transactionTmp.transaction.seqNumber) ) {
				sipsTrace('sipTransactionStorage:callId is found');
				return transactionStorage[i];
			};
		};

		sipsTrace('sipTransactionStorage:callId isn\'t found');
	};
	
	// TODO to refactor
	this.findExistingTransaction = function(callIdValue, method) {
		var count = transactionStorage.length;
			for (var i=0; i<count; i++){
				if( ( callIdValue == transactionStorage[i].transaction.callId ) &&
						( method == transactionStorage[i].transaction.method ) ) {
					sipsTrace('sipTransactionStorage:callId is found');
					return transactionStorage[i];
				};
			};
		sipsTrace('sipTransactionStorage:callId isn\'t found');
	};
	
	this.deleteTransaction = function(transaction) {
		sipsTrace('sipTransactionStorage:deleteTransaction length before is ' + transactionStorage.length);
		var index = transactionStorage.indexOf(transaction);
		if (index > -1) {
			transactionStorage.splice(index, 1);
		}
		sipsTrace('sipTransactionStorage:deleteTransaction length after is ' + transactionStorage.length);
	};
}

function sipTransport() {
	var transport = new Object();
	transport.host = '';
	transport.isIpv6 = false;
	transport.port = '';
	transport.protocol = TRANSPORT.TR_UDP;
	transport.handler = '';
	return transport;
}

function sipTransportManager() {
	// local transports list
	this.localTransportUdpIpv4 = sipTransport();
	this.localTransportUdpIpv6 = sipTransport();
	this.localTransportTcpIpv4 = sipTransport();
	this.localTransportTcpIpv6 = sipTransport();	
	this.localTransportWsIpv4 = sipTransport();
	this.localTransportWsIpv6 = sipTransport();
	// remote transports storage
	var remoteTransports = [];

	addRemoteTransport = function(transport) {
		// add transport object to the active transport list
		remoteTransports.push(transport);
	};	
	
	findTransportByHandler = function(handler) {
		for(var i=0;i<remoteTransports.length;i++) {
			if( remoteTransports[i].handler == handler ) {
				sipsTrace('sipTransportManager.findTransportByHandler transport is found');
				return remoteTransports[i];
			}
		}
	};	
	
	deleteRemoteTransport = function(handler) {
		var removedTransportIndex = -1;
		for(var i=0;i<remoteTransports.length;i++) {			
			if( remoteTransports[i].handler == handler ) {
				sipsTrace('sipTransportManager.deleteRemoteTransport transport is found');
				removedTransportIndex = i;
			}
		}
		if( removedTransportIndex != -1 ) {
			sipsTrace('sipTransportManager.deleteRemoteTransport transport is removed');
			remoteTransports.splice(removedTransportIndex, 1);
		}
	};
	
	this.addLocalListener = function(host, isIpv6, port, protocol, callback) {
		var transport = sipTransport();
		
		transport.host = host;
		transport.isIpv6 = isIpv6;
		transport.port = port;
		transport.protocol = protocol;		
		
		switch(protocol) {
		case TRANSPORT.TR_UDP:
			if(isIpv6) {
				this.localTransportUdpIpv6 = transport;
				this.localTransportUdpIpv6.handler = dgram.createSocket('udp6');
				this.localTransportUdpIpv6.handler.bind(port, host);
				this.localTransportUdpIpv6.handler.on("message", function (msg, rinfo) {
					  callback(msg, rinfo.address, rinfo.port);
					});				
			} else {
				this.localTransportUdpIpv4 = transport;
				this.localTransportUdpIpv4.handler = dgram.createSocket('udp4');
				this.localTransportUdpIpv4.handler.bind(port, host);
				sipsTrace('UDP listener is started: listening on port ' + transport.port);
				this.localTransportUdpIpv4.handler.on("message", function (msg, rinfo) {
			    	var remoteTransport = new sipTransport();
					
			    	remoteTransport.host = rinfo.address;
			    	remoteTransport.isIpv6 = false;
			    	remoteTransport.port = rinfo.port;
			    	remoteTransport.protocol = protocol;	
			    	// remoteTransport.handler = this.localTransportUdpIpv4.handler;
			    	
					  callback(msg, remoteTransport);
					});
			}	
			break;
		case TRANSPORT.TR_TCP:
			if(isIpv6) {
				this.localTransportTcpIpv6 = transport;
				this.localTransportTcpIpv6.handler = stream.createServer();
				this.localTransportTcpIpv6.handler.listen(port, host);
				this.localTransportTcpIpv6.handler.on('connection', function(sock) {
					sipsTrace('connected ipv6: ' + sock.remoteAddress +':'+ sock.remotePort);
				    // other stuff is the same from here
				    sock.on('data', function(msg) {
				    	var remoteTransport = new sipTransport();
						
				    	remoteTransport.host = sock.remoteAddress;
				    	remoteTransport.isIpv6 = true;
				    	remoteTransport.port = sock.remotePort;
				    	remoteTransport.protocol = protocol;	
				    	remoteTransport.handler = sock;
				    	
				    	sipsTrace('TCP ipv6 packet received: ' + msg);
				        callback(msg, remoteTransport); 
				    });
				});
			}
			else {
				this.localTransportTcpIpv4 = transport;
				this.localTransportTcpIpv4.handler = stream.createServer();
				this.localTransportTcpIpv4.handler.listen(port, host);
				sipsTrace('TCP listener is started: listening on port ' + transport.port);
				this.localTransportTcpIpv4.handler.on('connection', function(sock) {
					sipsTrace('connected ipv4: ' + sock.remoteAddress +':'+ sock.remotePort);
				    // other stuff is the same from here
				    sock.on('data', function(msg) {
				    	var remoteTransport = new sipTransport();
						
				    	remoteTransport.host = sock.remoteAddress;
				    	remoteTransport.isIpv6 = false;
				    	remoteTransport.port = sock.remotePort;
				    	remoteTransport.protocol = protocol;	
				    	remoteTransport.handler = sock;
				    	
				    	sipsTrace('TCP ipv4 packet received: ' + msg);
				        callback(msg, remoteTransport); 
				    });
				});
			};				
			break;
		case TRANSPORT.TR_WS:
			if(isIpv6) {
				this.localTransportWsIpv6 = transport;
			/*	this.localTransportUdpIpv6.handler = dgram.createSocket('udp6');
				this.localTransportUdpIpv6.handler.bind(port, host);
				this.localTransportUdpIpv6.handler.on("message", function (msg, rinfo) {
					  callback(msg, rinfo.address, rinfo.port);
					}); */				
			} else {
				
				function wsHttpServer(request, response) {
					sipsTrace('Received request for ' + request.url);
				    response.writeHead(404);
				    response.end();
				};
				
				var server = http.createServer(wsHttpServer);
				
				server.listen(transport.port, function() {
					sipsTrace('WebSocket listener is started: listening on port ' + transport.port);
				});
				
				this.localTransportWsIpv4 = transport;
				this.localTransportWsIpv4.handler = new websocket({
				    httpServer: server,
				    autoAcceptConnections: false
				});
				
				function wsRequestHandler(request) {
				    var connection = request.accept('sip', request.origin);
				    sipsTrace('WS Connection accepted.');
				    // add to remote transport list
			    	var remoteTransport = new sipTransport();
					
			    	remoteTransport.host = connection.remoteAddress;
			    	remoteTransport.isIpv6 = false;
			    	remoteTransport.port = 0;
			    	remoteTransport.protocol = TRANSPORT.TR_WS;	
			    	remoteTransport.handler = connection;
			    	
			    	addRemoteTransport(remoteTransport);
			    	
				    connection.on('message', function(message) {
		            	var transport = findTransportByHandler(connection);
			    		if( transport !== 'undefined' ) {
				            callback(message.utf8Data, transport); 	
			    		}
				    });
				    sipsTrace('close', function(reasonCode, description) {
				    	sipsTrace('WS Peer ' + connection.remoteAddress + ' disconnected.');
				    	deleteRemoteTransport(connection);
				    });
				};
				
				this.localTransportWsIpv4.handler.on('request', wsRequestHandler);
			}	
			break;
		default:
			break;
		};
	};
		
	this.addRemote = function(host, isIpv6, port, protocol) {
		var transport = sipTransport();
		
		transport.host = host;
		transport.isIpv6 = isIpv6;
		transport.port = port;
		transport.protocol = protocol;	
		
		// just add transport object to the active transport list
		remoteTransports.push(transport);	
	};
	
	this.getLocal = function(isIpv6, protocol) {
		switch(protocol) {
		case TRANSPORT.TR_UDP:
			if(isIpv6) {
				return this.localTransportUdpIpv6;
			} else {
				return this.localTransportUdpIpv4;
			}	
			break;
		case TRANSPORT.TR_TCP:
			if(isIpv6) {
				return this.localTransportTcpIpv6;
			} else {
				return this.localTransportTcpIpv4;
			}
			break;
		case TRANSPORT.TR_WS:
			if(isIpv6) {
				return this.localTransportWsIpv6;
			} else {
				return this.localTransportWsIpv4;
			}
			break;
		default:
			return this.localTransportUdpIpv4;
			break;
		};		
	};
	
	this.getRemote = function(isIpv6, protocol) {
		// at this time, take the first one in list
		// later, number prefix/priority might be added
		for (var i = 0, len = this.remoteTransports.length; i < len; i++) {
			if( ( this.remoteTransports[i].protocol == protocol ) &&
					( this.remoteTransports[i].isIpv6 == isIpv6 ) ) {
				return this.remoteTransports[i];
			}
		}
	};
	
	this.deleteRemote = function() {
		
	};
	
	this.send = function(remoteTransport, inmessage) {
		var message = new Buffer(inmessage.toString());
		switch(remoteTransport.protocol) {
		case TRANSPORT.TR_UDP:		
			if(remoteTransport.isIpv6) {
				sipsTrace('IPv6 UDP message is ' + message);
				this.localTransportUdpIpv6.handler.send(message, 0, message.length, 
						remoteTransport.port, remoteTransport.host, function(err, bytes) {
				    if (err) throw err;
				    sipsTrace('UDP message sent to ' + remoteTransport.host +':'+ remoteTransport.port);
				}	);
				
			} else {
				sipsTrace('UDP sent to ' + + remoteTransport.host +':'+ remoteTransport.port);
				sipsTrace('<<<<<<<<<<<<');
				sipsTrace(message.toString());
				sipsTrace('<<<<<<<<<<<<');
				this.localTransportUdpIpv4.handler.send(message, 0, message.length, 
						remoteTransport.port, remoteTransport.host, function(err, bytes) {
				    if (err) throw err;
				}	);
			}	
			break;
		case TRANSPORT.TR_TCP:
			sipsTrace(message.toString());
			var client = stream.connect(remoteTransport.port, remoteTransport.host);
			client.write(message);
			client.on('data', function(msg) {
				  sipsTrace(msg.toString());
				  //////callback(msg, remoteTransport.port, remoteTransport.host);
				});
			break;
		case TRANSPORT.TR_WS:
			sipsTrace('WS sent to ' + + remoteTransport.host +':'+ remoteTransport.port);
			sipsTrace('<<<<<<<<<<<<');
			sipsTrace(message.toString());
			sipsTrace('<<<<<<<<<<<<');
			remoteTransport.handler.send(inmessage.toString());
			break;
		default:
			break;
		};	
	};
	
	this.close = function(isIpv6, protocol) {		
		switch(protocol) {
		case TRANSPORT.TR_UDP:
			if(isIpv6) {
				this.localTransportUdpIpv6.handler.close();
			} else {
				this.localTransportUdpIpv4.handler.close();
			}	
			break;
		case TRANSPORT.TR_TCP:
			break;
		case TRANSPORT.TR_WS:
			break;
		default:
			break;
		};
	};
}

// registration primitives

function sipRegistration() {
	this.number = '';
	this.contact = '';
	// sip parameters for refresh
	this.callId = '';
	this.cSeq = '';
	this.fromTag = '';
	this.toTag = '';
	this.expires = 0;
	
	// registration timer
	var rTimer;
	
	this.startTimer = function(remove) {
		sipsTrace('start registration timer number ', this.number);
		rTimer = setTimeout(remove, ( this.expires * 1000 ), this);
	};

	this.updateTimer = function(val, remove) {
		sipsTrace('update registration timer for ', this.number);
		if( rTimer !== undefined ) {
			clearTimeout( rTimer );
		}
		this.expire = val;
		rTimer = setTimeout(remove, 
				( this.expires * 1000 ), this);		
	};
	
	this.stopTimer = function() {
		sipsTrace('stop registration timer for ', this.number);
		if( rTimer !== undefined ) {
			clearTimeout( rTimer );
		}		
	};	
	
	// received transport (useful for WebSocket connections)
	this.transport = ''; 
	// for JSON
	this.toJSON = function() {
		return { number : this.number ,
			contact: this.contact.toString(),
			callId : this.callId, 
			cSeq : this.cSeq,
			fromTag : this.fromTag,
			toTag : this.toTag,
			expires : this.expires
			};
	};
}

function sipRegistrationManager(sipProcessingInstance) {
	// registration storage
	var registrationInfo = [];
	
	this.processRegister = function(recvMessage, remoteTransport, transaction) {
		if( transaction !== undefined ) {
			// re-send treatment
		} else {
			// new registration
			sipsTrace('sipRegistrationManager:processRegister - new registration');
			var localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.enableIpv6, 
																					remoteTransport.protocol);
			// create transaction
			var registerTransaction = new sipNonInviteServerTransaction(SIP_METHOD.SM_REGISTER, 
					sipProcessingInstance.GetSipStack(), 
					localTransport, remoteTransport);
			registerTransaction.init();
			registerTransaction.receiveRequest(recvMessage);
			// ask registration module
			var registrationInstance = new sipRegistration();
			
			registrationInstance.callId = registerTransaction.transaction.callId;
			registrationInstance.fromTag = registerTransaction.transaction.fromTag;
			registrationInstance.toTag = registerTransaction.transaction.toTag;
			registrationInstance.cSeq = registerTransaction.transaction.seqNumber;
			registrationInstance.contact = recvMessage.contactHeader;
			registrationInstance.number = recvMessage.fromUri.user;
			registrationInstance.transport = remoteTransport;
			registrationInstance.expires = recvMessage.expiresValue;
			
			this.processRegistration(registrationInstance);
			// send response (may be not immediately)
			registerTransaction.createResponse(SIP_STATUS_CODE.SC_200);
			// push it to the active transaction's list
			sipProcessingInstance.GetSipTransaction().addTransaction(registerTransaction);
			// setd the response
			sipProcessingInstance.GetSipTransport().send(remoteTransport, registerTransaction.message);
			// delete transaction
			sipProcessingInstance.GetSipTransaction().deleteTransaction(registerTransaction);
		}	
	};
	
	this.addRegistration = function(registration) {
		sipsTrace('sipRegistrationManager:addRegistration length before is ' + registrationInfo.length);
		registrationInfo.push(registration);
		sipsTrace('sipRegistrationManager:addRegistration length after is ' + registrationInfo.length);
	};
	
	this.findRegistration = function(number, callId) {
		var l = registrationInfo.length;
		for (var i = 0; i < l; i++) {
			if( ( registrationInfo[i].number == number ) &&
					( registrationInfo[i].callId == callId ) )  {
				return registrationInfo[i];
			}
		}	
	};

	this.findUserRegistration = function(number) {
		var l = registrationInfo.length;
		for (var i = 0; i < l; i++) {
			if( registrationInfo[i].number == number )  {
				return registrationInfo[i];
			}
		}	
	};	
	
	this.processRegistration = function(registration) {
		// try to find the same registration in local registrationInfo
		var existingRegistration = this.findRegistration(registration.number, registration.callId);
		if( existingRegistration !== undefined ) {
			if( registration.expires !== 0 ) {
				sipsTrace('sipRegistrationManager:processRegistration - existing registration');
				existingRegistration.updateTimer(registration.expires, this.deleteRegistration);
			} else {
				sipsTrace('sipRegistrationManager:processRegistration - existing registration with 0 expires');
				// stop timer
				existingRegistration.stopTimer();
				// end of expiration
				this.deleteRegistration(existingRegistration);
			}			
		} else {
			// new registration
			if( registration.expires !== 0 ) {
				if( registration.expires === -1 ) {
					// a value by default could be taken
				}
				sipsTrace('sipRegistrationManager:processRegistration - new registration');
				// start registration timer
				registration.startTimer(this.deleteRegistration);
				// add registration to local storage
				this.addRegistration(registration);
			} else {
				sipsTrace('sipRegistrationManager:processRegistration - new registration with 0 expires');
				// end of expiration
				// do nothing
			}
		}
	};
	
	this.deleteRegistration = function(registration) {
		sipsTrace('sipRegistrationManager:deleteRegistration length before is ' + registrationInfo.length);
		var index = registrationInfo.indexOf(registration);
		if (index > -1) {
			registrationInfo.splice(index, 1);
		}
		sipsTrace('sipRegistrationManager:deleteRegistration length after is ' + registrationInfo.length);
	};
}

// call processing primitives

// connection type
var CONNECTION_TYPE = {
	CONNECTION_INBOUND:0,
	CONNECTION_OUTBOUND:1
};

function sipConnection(connNumber, callId, type) {
	// connection parameters 
	var number = connNumber; // connection number
	// SIP dialog/transaction parameters
	var sipCallId = callId;
	this.remoteTag = '';
	this.localTag = '';
	this.cSeq = 1;
	this.branchId = '';
	
	// connection internal parameters
	if( type != undefined ) {
		this.connectionType = type;
	} else {
		this.connectionType = CONNECTION_TYPE.CONNECTION_INBOUND;
	}
	// connection state
	this.connectionState = '';
	// SDP offer/answer
	var sdpOffer = [];
	var sdpAnswer = [];
	// peer/counterpart connection
	this.peerConnection;
	
	this.getCallId = function() {
		return sipCallId;
	};
	this.getNumber = function() {
		return number;
	};
}

function sipCall(callId) {
	// call parameters 
	var globalCallId = callId;	
	var connectionStorage = [];
	
	this.getGlobalCallId = function() {
		return globalCallId;
	};
	this.addConnection = function() {
		
	};
	this.findConnection = function() {
		
	};
	this.deleteConnection = function(number) {
		
	};
}

// main sip call processing module
// should be adapted for b2bua, proxy, ua architecture
function sipCallProcessing(sipProcessingInstance) {
	// call parameters 
	var callStorage = [];
	// connection parameters
	var connectionStorage = [];
	
	var findConnection = function(sipCallId) {
		var len = connectionStorage.length;
		
		for (var i = 0; i < len; i++) {
			if( connectionStorage[i].getCallId() == sipCallId ) {
				return connectionStorage[i];
			}
		}
	};

	var deleteConnection = function(connection) {
		// sipsTrace('sipCallProcessing:deleteConnection length before is ' + connectionStorage.length);
		var index = connectionStorage.indexOf(connection);
		if (index > -1) {
			connectionStorage.splice(index, 1);
		}
		// sipsTrace('sipCallProcessing:deleteConnection length after is ' + connectionStorage.length);
	};	
	
	this.processInvite = function(recvMessage, remoteTransport, transaction) {
		if( transaction !== undefined ) {
			sipsTrace('sipCallProcessing.processInvite INVITE retransmission');
			
		} else {

			var localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.enableIpv6, remoteTransport.protocol);
			// create transaction
			var inviteTransaction = new sipInviteServerTransaction(SIP_METHOD.SM_INVITE, 
				sipProcessingInstance.GetSipStack(), localTransport, remoteTransport);

			inviteTransaction.init(recvMessage.callIdValue);
			inviteTransaction.receiveRequest(recvMessage);
			// if it's a new call, create call/connection
			// TODO verify if destination can be reachable via dial-plan resolution
			// verify if destination is exist via registration resolution
			
			var registrationInfo;
			if(recvMessage.requestUri.user !== undefined ) {
				registrationInfo = sipProcessingInstance.GetRegistration().findUserRegistration(recvMessage.requestUri.user);
			}
			sipsTrace('sipCallProcessing.processInvite try to find a registration');
			// push it to the active transaction's list
			sipProcessingInstance.GetSipTransaction().addTransaction(inviteTransaction);
			//
			var connection = findConnection(inviteTransaction.transaction.callId);
			
			if ( registrationInfo == undefined) {
				if( connection !== undefined ) {
					// re-INVITE scenario
					this.updateConnection(inviteTransaction, connection);
				} else {
					sipsTrace('sipCallProcessing.processInvite registration isn\'t found');
					inviteTransaction.createResponse(SIP_STATUS_CODE.SC_404);
					sipProcessingInstance.GetSipTransport().send(remoteTransport, inviteTransaction.message);		
				}
			} else {
				if( connection !== undefined ) {
					// re-INVITE scenario
					this.updateConnection(inviteTransaction, connection);
				} else {
					inviteTransaction.createResponse(SIP_STATUS_CODE.SC_100);
					sipProcessingInstance.GetSipTransport().send(remoteTransport, inviteTransaction.message);
					// create new call
					this.makeCall(inviteTransaction, recvMessage.requestUri.user, registrationInfo);					
				}
			};
		}
	};
	
	this.processCancel = function(recvMessage, remoteTransport, transaction) {
		if( transaction !== undefined ) {
			sipsTrace('sipCallProcessing.processCancel CANCEL retransmission');
		} else {
			sipsTrace('sipCallProcessing.processCancel retransmission');
			var localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.enableIpv6, remoteTransport.protocol);
			// create transaction
			var cancelTransaction = new sipInviteServerTransaction(SIP_METHOD.SM_CANCEL, 
					sipProcessingInstance.GetSipStack(), localTransport, remoteTransport);

			cancelTransaction.init(recvMessage.callIdValue);
			cancelTransaction.receiveRequest(recvMessage);
			// verify if destination is exist via registration resolution
			var registrationInfo = sipProcessingInstance.GetRegistration().findUserRegistration(recvMessage.requestUri.user);
			sipsTrace('sipCallProcessing.processCancel try to find a registration');
			// push it to the active transaction's list
			sipProcessingInstance.GetSipTransaction().addTransaction(cancelTransaction);
			
			var connection = findConnection(cancelTransaction.transaction.callId);
			if( connection !== undefined ) {
				sipsTrace('sipCallProcessing:cancelTransaction connection is found');
				// TODO state transaction update
				// propagate response to peer connection
				this.cancelConnection(cancelTransaction, connection);
			} else {
				sipsTrace('sipCallProcessing:processCancel response for unknown connection is received');
				cancelTransaction.createResponse(SIP_STATUS_CODE.SC_404);
				sipProcessingInstance.GetSipTransport().send(remoteTransport, cancelTransaction.message);
			}		
			
		}
	};	
	
	this.cancelConnection = function(transaction, connection) {
		var localTransport;
		var remoteTransport;
		
		sipsTrace('sipCallProcessing.cancelConnection peer connection is '+ connection.peerConnection.getCallId());
		
		var registrationInfo = sipProcessingInstance.GetRegistration().findUserRegistration(connection.peerConnection.getNumber());
		if( registrationInfo !== undefined ) {
			sipsTrace('sipCallProcessing.cancelConnection transport for peer connection is found');
			remoteTransport = registrationInfo.transport;
			localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.isIpv6, remoteTransport.protocol);
			var cancelTransaction = new sipNonInviteClientTransaction(SIP_METHOD.SM_CANCEL, sipProcessingInstance.GetSipStack(), localTransport, remoteTransport);
			sipsTrace('sipCallProcessing.clearConnection create CANCEL message');
			var peerConnection = connection.peerConnection;
			
			var rTag='';
			var lTag = ( peerConnection.connectionType === CONNECTION_TYPE.CONNECTION_INBOUND)? peerConnection.localTag: peerConnection.remoteTag;

			cancelTransaction.init(peerConnection.getCallId(), 
					lTag, rTag, peerConnection.cSeq, peerConnection.branchId);			
			
			cancelTransaction.createRequest(SIP_METHOD.SM_CANCEL, '', transaction.remoteMessage.getSdp(), transaction.remoteMessage.contentType);
			// add transaction to active transaction list
			sipProcessingInstance.GetSipTransaction().addTransaction(cancelTransaction);
			// update several headers
			cancelTransaction.message.fromDisplayName = transaction.remoteMessage.fromDisplayName;
			cancelTransaction.message.fromUri.user = transaction.remoteMessage.fromUri.user;
			cancelTransaction.message.toDisplayName = transaction.remoteMessage.toDisplayName;
			cancelTransaction.message.toUri.user = transaction.remoteMessage.toUri.user;
			
			cancelTransaction.message.requestUri.user = transaction.remoteMessage.requestUri.user;
			
			if( transaction.remoteMessage.maxForwards > 1 ) {
				cancelTransaction.message.maxForwards = transaction.remoteMessage.maxForwards - 1;
			}
			sipProcessingInstance.GetSipTransport().send(remoteTransport, cancelTransaction.message);
		} else {
			sipsTrace('sipCallProcessing.cancelConnection transport for peer connection isn\'t found');
		}
	};
	
	this.makeCall = function(transaction, number, registrationInfo) {
		var localTransport;
		var remoteTransport;
		
		// determine transport type (registration Contact searching)
		var remoteTransportProtocol = TRANSPORT.TR_WS;
		// WebSocket transport - use saved transport if it exists
		if( remoteTransportProtocol === TRANSPORT.TR_WS ) {
			remoteTransport = registrationInfo.transport;
			if(remoteTransport === undefined) {
				sipsTrace('sipCallProcessing.makeCall no transport for WebSocket connection');
				return;
			} else {
				sipsTrace('sipCallProcessing.makeCall find stored transport for WebSocket connection');
				localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.isIpv6, remoteTransport.protocol);
		
			}
		} else {
			// TODO get local transport by contact protocol
			// localTransport
		}
		
		// create call
		var newCall = new sipCall(sipProcessingInstance.GetSipStack().getGlobalCallId());
		// create caller dialog / connection
		var callerConnection = new sipConnection(transaction.remoteMessage.fromUri.user, 
				transaction.remoteMessage.callIdValue, CONNECTION_TYPE.CONNECTION_INBOUND);
		// create an Invite client transaction
		var inviteTransaction = new sipInviteClientTransaction(SIP_METHOD.SM_INVITE, 
								sipProcessingInstance.GetSipStack(), 
								localTransport, remoteTransport, 
								this.reSendMessage, sipProcessingInstance.GetSipTransaction().deleteTransaction);
		sipsTrace('sipCallProcessing.makeCall initial INVITE message');
		// create an empty INVITE message
		inviteTransaction.init();
		inviteTransaction.createRequest(SIP_METHOD.SM_INVITE, number, transaction.remoteMessage.getSdp(), transaction.remoteMessage.contentType);
		// update several headers using remote message
		inviteTransaction.message.fromDisplayName = transaction.remoteMessage.fromDisplayName;
		inviteTransaction.message.fromUri.user = transaction.remoteMessage.fromUri.user;
		// add/copy extra headers
		// create callee dialog / connection
		var calleeConnection = new sipConnection(number, 
				inviteTransaction.message.callIdValue, CONNECTION_TYPE.CONNECTION_OUTBOUND);
		
		callerConnection.peerConnection = calleeConnection;
		calleeConnection.peerConnection = callerConnection;
		// fill some fields
		
		calleeConnection.localTag = inviteTransaction.transaction.fromTag;
		calleeConnection.cSeq = inviteTransaction.transaction.seqNumber;
		calleeConnection.branchId = inviteTransaction.transaction.branch;
		
		callerConnection.remoteTag = transaction.transaction.fromTag;
		callerConnection.localTag = transaction.transaction.toTag;
		callerConnection.cSeq = transaction.transaction.seqNumber;
		
		if( transaction.remoteMessage.maxForwards > 1 ) {
			inviteTransaction.message.maxForwards = transaction.remoteMessage.maxForwards - 1;
		}
		
		// push all connections to local storages
		connectionStorage.push(calleeConnection);
		connectionStorage.push(callerConnection);
		callStorage.push(newCall);
		// push it to the active transaction's list
		sipProcessingInstance.GetSipTransaction().addTransaction(inviteTransaction);
		// TODO - sync with global storage
		sipProcessingInstance.GetSipTransport().send(remoteTransport, inviteTransaction.message);

		// start caller dialog
		
		// store call / connection state 
	};

	this.reSendMessage = function(transaction, remoteTransport) {
		sipsTrace('sipCallProcessing.reSendMessage');
		sipProcessingInstance.GetSipTransport().send(remoteTransport, transaction.message);
	};
	
	// hold/retrieve/SDP changing operations
	this.updateConnection = function(transaction, connection) {
		var localTransport;
		var remoteTransport;
		
		sipsTrace('sipCallProcessing.updateConnection peer connection is '+ connection.peerConnection.getCallId());
		
		var registrationInfo = sipProcessingInstance.GetRegistration().findUserRegistration(connection.peerConnection.getNumber());
		if( registrationInfo !== undefined ) {
			sipsTrace('sipCallProcessing.updateConnection transport for peer connection is found');
			remoteTransport = registrationInfo.transport;
			localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.isIpv6, remoteTransport.protocol);
			var inviteTransaction = new sipInviteClientTransaction(SIP_METHOD.SM_INVITE, 
					sipProcessingInstance.GetSipStack(), localTransport, remoteTransport,this.reSendMessage, 
					sipProcessingInstance.GetSipTransaction().deleteTransaction);
			sipsTrace('sipCallProcessing.updateConnection create INVITE message');
			var peerConnection = connection.peerConnection;
			
			peerConnection.cSeq += 1;

			var rTag = ( peerConnection.connectionType === CONNECTION_TYPE.CONNECTION_INBOUND)? peerConnection.remoteTag: peerConnection.localTag;
			var lTag = ( peerConnection.connectionType === CONNECTION_TYPE.CONNECTION_INBOUND)? peerConnection.localTag: peerConnection.remoteTag;
			
			inviteTransaction.init(peerConnection.getCallId(), 
					lTag, rTag, peerConnection.cSeq);			
			inviteTransaction.createRequest(SIP_METHOD.SM_INVITE, '', transaction.remoteMessage.getSdp(), transaction.remoteMessage.contentType);
			// add transaction to active transaction list
			sipProcessingInstance.GetSipTransaction().addTransaction(inviteTransaction);
			// update several headers
			inviteTransaction.message.fromDisplayName = transaction.remoteMessage.fromDisplayName;
			inviteTransaction.message.fromUri.user = transaction.remoteMessage.fromUri.user;
			inviteTransaction.message.toDisplayName = transaction.remoteMessage.toDisplayName;
			inviteTransaction.message.toUri.user = transaction.remoteMessage.toUri.user;
			if( transaction.remoteMessage.maxForwards > 1 ) {
				inviteTransaction.message.maxForwards = transaction.remoteMessage.maxForwards - 1;
			}
			sipProcessingInstance.GetSipTransport().send(remoteTransport, inviteTransaction.message);
		} else {
			sipsTrace('sipCallProcessing.updateConnection transport for peer connection isn\'t found');
		}	
	};
	
	this.processAck = function(recvMessage, remoteTransport, transaction) {
		sipsTrace('sipCallProcessing.processAck ACK processing');
		transaction.receiveRequest(recvMessage);
		// find connection
		var connection = findConnection(transaction.transaction.callId);
		if( connection !== undefined ) {
			sipsTrace('sipCallProcessing:processAck connection is found');
			// TODO state transaction update
			// propagate response to peer connection
			sipsTrace('searching transaction is '+ connection.peerConnection.getCallId());
			var peerTransaction = sipProcessingInstance.GetSipTransaction().findExistingTransaction(connection.peerConnection.getCallId(), SIP_METHOD.SM_INVITE);
			if( peerTransaction !== undefined ) {
				sipsTrace('sipCallProcessing:processAck peer transaction is found');

				peerTransaction.createRequest(SIP_METHOD.SM_ACK, recvMessage.requestUri.user, 
						transaction.remoteMessage.getSdp(), transaction.remoteMessage.contentType);
				// update several headers
				peerTransaction.message.fromDisplayName = transaction.remoteMessage.fromDisplayName;
				peerTransaction.message.fromUri.user = transaction.remoteMessage.fromUri.user;
				
				// copy/add some headers here
				if( peerTransaction.remoteTransport.handler !== undefined ) {
					sipProcessingInstance.GetSipTransport().send(peerTransaction.remoteTransport, peerTransaction.message);
				} else {
					// TODO find an apropriate transport
				}
				// delete transactions
				sipProcessingInstance.GetSipTransaction().deleteTransaction(peerTransaction);
				sipProcessingInstance.GetSipTransaction().deleteTransaction(transaction);
				
			} else {
				sipsTrace('sipCallProcessing:processAck peer transaction isn\'t found');
			}
		} else {
			sipsTrace('sipCallProcessing:processAck response for unknown connection is received');
		}
	};	
	
	this.processBye = function(recvMessage, remoteTransport, transaction) {
		var localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.enableIpv6, remoteTransport.protocol);
		// create transaction
		var byeTransaction = new sipNonInviteServerTransaction(SIP_METHOD.SM_BYE, 
				sipProcessingInstance.GetSipStack(), localTransport, remoteTransport);

		byeTransaction.init(recvMessage.callIdValue);
		byeTransaction.receiveRequest(recvMessage);

		// push it to the active transaction's list
		sipProcessingInstance.GetSipTransaction().addTransaction(byeTransaction);
		sipsTrace('sipCallProcessing.processBye try to find a connection');
		var connection = findConnection(byeTransaction.transaction.callId);
		if( connection !== undefined ) {
			sipsTrace('sipCallProcessing:processBye connection is found');
			// TODO state transaction update
			// propagate response to peer connection
			this.clearConnection(byeTransaction, connection);
		} else {
			sipsTrace('sipCallProcessing:processBye response for unknown connection is received');
			byeTransaction.createResponse(SIP_STATUS_CODE.SC_404);
			sipProcessingInstance.GetSipTransport().send(remoteTransport, byeTransaction.message);
		}		
	};

	this.clearConnection = function(transaction, connection) {
		var localTransport;
		var remoteTransport;
		
		sipsTrace('sipCallProcessing.clearConnection peer connection is '+ connection.peerConnection.getCallId());
		
		var registrationInfo = sipProcessingInstance.GetRegistration().findUserRegistration(connection.peerConnection.getNumber());
		if( registrationInfo !== undefined ) {
			sipsTrace('sipCallProcessing.clearConnection transport for peer connection is found');
			remoteTransport = registrationInfo.transport;
			localTransport = sipProcessingInstance.GetSipTransport().getLocal(remoteTransport.isIpv6, remoteTransport.protocol);
			var byeTransaction = new sipNonInviteClientTransaction(SIP_METHOD.SM_BYE, sipProcessingInstance.GetSipStack(), localTransport, remoteTransport);
			sipsTrace('sipCallProcessing.clearConnection create BYE message');
			var peerConnection = connection.peerConnection;
			
			peerConnection.cSeq += 1;

			var rTag = ( peerConnection.connectionType === CONNECTION_TYPE.CONNECTION_INBOUND)? peerConnection.remoteTag: peerConnection.localTag;
			var lTag = ( peerConnection.connectionType === CONNECTION_TYPE.CONNECTION_INBOUND)? peerConnection.localTag: peerConnection.remoteTag;
			
			byeTransaction.init(peerConnection.getCallId(), 
					lTag, rTag, peerConnection.cSeq);			
			
			byeTransaction.createRequest(SIP_METHOD.SM_BYE, '', transaction.remoteMessage.getSdp(), transaction.remoteMessage.contentType);
			// add transaction to active transaction list
			sipProcessingInstance.GetSipTransaction().addTransaction(byeTransaction);
			// update several headers
			byeTransaction.message.fromDisplayName = transaction.remoteMessage.fromDisplayName;
			byeTransaction.message.fromUri.user = transaction.remoteMessage.fromUri.user;
			byeTransaction.message.toDisplayName = transaction.remoteMessage.toDisplayName;
			byeTransaction.message.toUri.user = transaction.remoteMessage.toUri.user;
			if( transaction.remoteMessage.maxForwards > 1 ) {
				byeTransaction.message.maxForwards = transaction.remoteMessage.maxForwards - 1;
			}
			sipProcessingInstance.GetSipTransport().send(remoteTransport, byeTransaction.message);
		} else {
			sipsTrace('sipCallProcessing.clearConnection transport for peer connection isn\'t found');
		}
	};	
	
	// process 100 - 699 responses
	this.processResponse = function(recvMessage, remoteTransport, transaction) {
		sipsTrace('sipCallProcessing:processResponse message response');
		// store received message
		transaction.receiveResponse(recvMessage);
		
		if(recvMessage.statusCode == SIP_STATUS_CODE.SC_100) {
			sipsTrace('sipCallProcessing:processResponse 100 Trying is received - ignore it');
			// TODO don't resend status Trying, just state transaction update
			return;
		}
		sipsTrace('sipCallProcessing:processResponse trying to find a connection for ' + transaction.transaction.callId);
		// find connection
		var connection = findConnection(transaction.transaction.callId);
		if( connection !== undefined ) {
			sipsTrace('sipCallProcessing:processResponse connection is found');
			// TODO state transaction update
			// propagate response to peer connection
			sipsTrace('searching transaction is '+ connection.peerConnection.getCallId());
			var peerTransaction = sipProcessingInstance.GetSipTransaction().findExistingTransaction(connection.peerConnection.getCallId(), recvMessage.cSeqMethod);
			if( peerTransaction !== undefined ) {
				sipsTrace('sipCallProcessing:processResponse peer transaction is found');
				peerTransaction.createResponse(recvMessage.statusCode, recvMessage.getSdp(), recvMessage.contentType);
				
				// copy/add some headers here
				if( peerTransaction.remoteTransport.handler !== undefined ) {
					sipProcessingInstance.GetSipTransport().send(peerTransaction.remoteTransport, peerTransaction.message);
				} else {
					// TODO find an apropriate transport
				}
			} else {
				sipsTrace('sipCallProcessing:processResponse peer transaction isn\'t found');
			}
			// update some information, only for INVITE transaction
			if(recvMessage.cSeqMethod == SIP_METHOD.SM_INVITE) {
				connection.localTag = transaction.transaction.toTag;
				connection.remoteTag = transaction.transaction.fromTag;	
			}
			if(recvMessage.cSeqMethod == SIP_METHOD.SM_BYE) {
				sipProcessingInstance.GetSipTransaction().deleteTransaction(peerTransaction);
				sipProcessingInstance.GetSipTransaction().deleteTransaction(transaction);
				
				deleteConnection(connection.peerConnection);
				deleteConnection(connection);
			}
		} else {
			sipsTrace('sipCallProcessing:processResponse response for unknown connection is received');
		}
	};
}

//server-related functions
function sipProcessingInstance() {
	// various SIP-client parts instances
	var sipStackInstance;
	var sipTransportInstance;
	var sipRegistrationInstance;
	var configurationInstance;
	var sipCallProcessingInstance;
	var sipTransactionInstance;
	
	this.GetSipStack = function() {
		return sipStackInstance;
	};
	this.GetSipTransport = function() {
		return sipTransportInstance;
	};	
	this.GetRegistration = function() {
		return sipRegistrationInstance;
	};
	this.GetConfiguration = function() {
		return configurationInstance;
	};
	this.GetCallProcessing = function() {
		return sipCallProcessingInstance;
	};
	this.GetSipTransaction = function() {
		return sipTransactionInstance;
	};
	
	this.start = function(configuration) {
		// create an instance of SIP stack
		sipsTrace('SIP Server instance initialization');
		sipsTrace('Init timestamp: ' + Date());
		sipStackInstance = new sipStack();
		// sip transaction storage
		sipTransactionInstance = new sipTransactionStorage();
		// save configuration pointer
		configurationInstance = configuration;
		// initialize and add the transports
		sipTransportInstance = new sipTransportManager();
		sipTransportInstance.addLocalListener(configuration.localIpv4Address, false, configuration.localUdpPort, TRANSPORT.TR_UDP, this.onUdpReceive);
		sipTransportInstance.addLocalListener(configuration.localIpv4Address, false, configuration.localTcpPort, TRANSPORT.TR_TCP, this.onTcpReceive);
		sipTransportInstance.addLocalListener(configuration.localIpv4Address, false, configuration.localWsPort, TRANSPORT.TR_WS, this.onWsReceive);
		sipTransportInstance.addLocalListener(configuration.localIpv6Address, true, configuration.localUdpPort, TRANSPORT.TR_UDP, this.onUdpReceive);
		sipTransportInstance.addLocalListener(configuration.localIpv6Address, true, configuration.localTcpPort, TRANSPORT.TR_TCP, this.onTcpReceive);
		sipTransportInstance.addLocalListener(configuration.localIpv6Address, true, configuration.localWsPort, TRANSPORT.TR_WS, this.onWsReceive);
		// initialize registration manager
		sipRegistrationInstance = new sipRegistrationManager(this);
		// initialize call processing module
		sipCallProcessingInstance = new sipCallProcessing(this);

		sipsTrace('SIP Server initialization finished successfully');
	};
	this.onUdpReceive = function(msg, remoteTransport) {
		sipsTrace("UDP received from " + remoteTransport.host + ":" + remoteTransport.port);
		sipsTrace('>>>>>>>>>>>>');
		sipsTrace('' + msg);
		sipsTrace('>>>>>>>>>>>>');
		onData(msg, remoteTransport);
	};
	this.onTcpReceive = function(msg, host, port) {
		sipsTrace("TCP received from " + host + ":" + port);
		sipsTrace('>>>>>>>>>>>>');
		sipsTrace(msg);
		sipsTrace('>>>>>>>>>>>>');
		onData(msg, host, port);
	};
	this.onWsReceive = function(msg, remoteTransport) {
		sipsTrace("WS received from " + remoteTransport.host + ":" + remoteTransport.port);
		sipsTrace('>>>>>>>>>>>>');
		sipsTrace(msg);
		sipsTrace('>>>>>>>>>>>>');
		onData(msg, remoteTransport);
	};
	
	var onData = function(data, remoteTransport) {
		sipsTrace('sipServer:onData packet is received');
		// parse received message
		var recvMessage = new sipMessage();
		var rc = recvMessage.parseString(data.toString());
		if( rc == SIPST_STATUS.SIPSC_SUCCESS ) {
			// try to find a transaction and process the message
			sipsTrace('sipServer:onData try to find an assotiated transaction');
			var transaction = sipTransactionInstance.findTransaction(recvMessage);
			
			if( transaction == undefined) {
				sipsTrace('sipServer:onData new transaction');
				if(recvMessage.statusCode.length > 0) {
					sipsTrace('sipServer:onData unknown response - just ignore it');
				}
				else {
					sipsTrace('sipServer:onData new request is received');
					switch(recvMessage.method)
					{
					case SIP_METHOD.SM_REGISTER:
						sipsTrace('sipServer:onData REGISTER message');
						sipRegistrationInstance.processRegister(recvMessage, remoteTransport);
						break;
					case SIP_METHOD.SM_INVITE:
						sipsTrace('sipServer:onData INVITE message');
						sipCallProcessingInstance.processInvite(recvMessage, remoteTransport);
						break;
					case SIP_METHOD.SM_CANCEL:
						sipsTrace('sipServer:onData CANCEL message');
						sipCallProcessingInstance.processCancel(recvMessage, remoteTransport);
						break;
					case SIP_METHOD.SM_ACK:
						sipsTrace('sipServer:onData ACK message');
						sipCallProcessingInstance.processAck(recvMessage, remoteTransport);
						break;
					case SIP_METHOD.SM_BYE:
						sipsTrace('sipServer:onData BYE message');
						sipCallProcessingInstance.processBye(recvMessage, remoteTransport);
						break;
					default:
						sipsTrace('sipServer:onData - the treatment of ' + recvMessage.method + ' method isn\'t implemented yet');
						break;
					};
				}
			} else {
				sipsTrace('sipServer:onData existing transaction');
				if(recvMessage.statusCode > 0) {
					sipsTrace('sipServer:onData new response for existing transaction is received');
					switch(recvMessage.cSeqMethod)
					{
					case SIP_METHOD.SM_REGISTER:
						sipsTrace('sipServer:onData REGISTER message');
						/// TODO sipRegistrationInstance.processResponse(recvMessage, remoteTransport);
						break;
					case SIP_METHOD.SM_INVITE:
						sipsTrace('sipServer:onData INVITE message response');
						sipCallProcessingInstance.processResponse(recvMessage, remoteTransport, transaction);
						break;
					case SIP_METHOD.SM_CANCEL:
						sipsTrace('sipServer:onData CANCEL message response');
						sipCallProcessingInstance.processResponse(recvMessage, remoteTransport, transaction);
						break;
					case SIP_METHOD.SM_BYE:
						sipsTrace('sipServer:onData BYE message response');
						sipCallProcessingInstance.processResponse(recvMessage, remoteTransport, transaction);
						break;
					default:
						sipsTrace('sipServer:onData - the treatment of response for ' + recvMessage.cSeqMethod + 
								' method isn\'t implemented yet');
						break;
					};
				}
				else {
					sipsTrace('sipServer:onData new request for existing transaction is received');
					switch(recvMessage.method)
					{
					case SIP_METHOD.SM_REGISTER:
						sipsTrace('sipServer:onData REGISTER message');
						sipRegistrationInstance.processRegister(recvMessage, remoteTransport, transaction);
						break;
					case SIP_METHOD.SM_INVITE:
						sipsTrace('sipServer:onData INVITE message');
						sipCallProcessingInstance.processInvite(recvMessage, remoteTransport, transaction);
						break;
					case SIP_METHOD.SM_CANCEL:
						sipsTrace('sipServer:onData CANCEL message');
						sipCallProcessingInstance.processCancel(recvMessage, remoteTransport, transaction);
						break;
					case SIP_METHOD.SM_ACK:
						sipsTrace('sipServer:onData ACK message');
						sipCallProcessingInstance.processAck(recvMessage, remoteTransport, transaction);
						break;
					case SIP_METHOD.SM_BYE:
						sipsTrace('sipServer:onData BYE message');
						sipCallProcessingInstance.processBye(recvMessage, remoteTransport, transaction);
						break;
					default:
						sipsTrace('sipServer:onData - the treatment of ' + recvMessage.method + ' method isn\'t implemented yet');
						break;
					};
				}	
			}
		} else {
			if( rc == SIPST_STATUS.SIPSC_MESSAGE_KEEPALIVE ) {
				sipsTrace('sipServer:onData ping is received, pong is sent');
				sipTransportInstance.send(remoteTransport, "\r\n\r\n");
			} else {
				sipsTrace('sipServer:onData error in packet parsing');
			}
			
		}
	};
}


var localPort = 5050;	// local SIP port base

var settingsInstance = new sipSettings(localPort);
var sipServerInstance = new sipProcessingInstance();
sipServerInstance.start(settingsInstance);
