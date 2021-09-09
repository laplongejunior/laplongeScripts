// ==UserScript==
// @name         TestDome MHTML maker
// @version      0.1
// @author       laplongejunior
// @match        https://www.testdome.com/cert/*
// @start-at     document-end
// ==/UserScript==

(function(EMAIL) {	
    "use strict";
    if (!location.href.indexOf("testdome.com/cert") < 0) return;
	
	var doc = window.document;
	var REMOVE = function(n){n.remove()};
	
	// Reveals email address without using the form
	var verify = doc.getElementById('VerifyEmailForm');
	if (verify !== null) {
		verify.parentElement.insertBefore(doc.createTextNode(EMAIL),verify);
		REMOVE(verify);
	}

	var body = doc.body;
	
	// Removes website decoration 
	body.querySelectorAll('.olark-custom-button').forEach(REMOVE);
})('send.email.4.programmer.joke@gmail.com');
