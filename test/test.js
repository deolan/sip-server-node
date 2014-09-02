var should = require('should');
var assert = require('assert');

var sipStack = require('../SipServer.js');

describe('SipUri', function(){
  describe('parse/create sip:alice@domain.com', function(){
    it('Should parse uri string correctly and return a well-constructed SipUri', function(){
    	var  uri = new sipStack.sipUri();
    	uri.parseString('sip:alice@domain.com');
    	uri.should.have.ownProperty('scheme').equal('sip');
    	uri.should.have.ownProperty('user').equal('alice');
    	uri.should.have.ownProperty('host').equal('domain.com');
    	uri.toString().should.equal('sip:alice@domain.com');
    })
  })
})

describe('SipUri', function(){
  describe('parse/create sips:alice:password@domain.com:5063;param1;param2;param3;param4', function(){
    it('Should parse uri string correctly and return a well-constructed SipUri', function(){    	
    	var  uri = new sipStack.sipUri();
    	uri.parseString('sips:alice:password@domain.com:5063;param1;param2;param3;param4');
    	uri.should.have.ownProperty('scheme').equal('sips');
    	uri.should.have.ownProperty('user').equal('alice');
    	uri.should.have.ownProperty('password').equal('password');
    	uri.should.have.ownProperty('host').equal('domain.com');
    	uri.should.have.ownProperty('port').equal(5063);
    	uri.toString().should.equal('sips:alice:password@domain.com:5063;param1;param2;param3;param4');
    })
  })
})

describe('SipUri', function(){
  describe('parse/create sip:127.0.0.1', function(){
    it('Should parse uri string correctly and return a well-constructed SipUri', function(){    	
    	var  uri = new sipStack.sipUri();
    	uri.parseString('sip:127.0.0.1');
    	uri.should.have.ownProperty('scheme').equal('sip');
    	uri.should.have.ownProperty('user').be.empty;
    	uri.should.have.ownProperty('host').equal('127.0.0.1');
    	uri.toString().should.equal('sip:127.0.0.1');
    })
  })
})


describe('SipUri', function(){
  describe('parse/create sip:alice@domain.com:5060;param1=value', function(){
    it('Should parse uri string correctly and return a well-constructed SipUri', function(){    	
    	var  uri = new sipStack.sipUri();
    	uri.parseString('sip:alice@domain.com:5060;param1=value');
    	uri.should.have.ownProperty('scheme').equal('sip');
    	uri.should.have.ownProperty('user').equal('alice');
    	uri.should.have.ownProperty('host').equal('domain.com');
    	uri.should.have.ownProperty('port').equal(5060);
    	uri.toString().should.equal('sip:alice@domain.com:5060;param1=value');
    })
  })
})

describe('SipUri', function(){
  describe('parse/create sips:alice:password@[2000::1]:5061;1;2;3;4', function(){
    it('Should parse uri string correctly and return a well-constructed SipUri', function(){    	
    	var  uri = new sipStack.sipUri();
    	uri.parseString('sips:alice:password@[2000::1]:5061;1;2;3;4');
    	uri.should.have.ownProperty('scheme').equal('sips');
    	uri.should.have.ownProperty('user').equal('alice');
    	uri.should.have.ownProperty('host').equal('2000::1');
    	uri.should.have.ownProperty('port').equal(5061);
    	uri.toString().should.equal('sips:alice:password@[2000::1]:5061;1;2;3;4');
    })
  })
})

describe('SipUri', function(){
  describe('parse/create <sip:1000@[2607:f0d0:2001:a::10]>', function(){
    it('Should parse uri string and return an error', function(){    	
    	var  uri = new sipStack.sipUri();
    	uri.parseString('<sip:1000@[2607:f0d0:2001:a::10]>').should.equal(sipStack.SIPST_STATUS.SIPSC_URI_PARSER_ERROR);
    })
  })
})