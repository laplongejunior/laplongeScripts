// ==UserScript==
// @name         TestDome PDF Maker
// @version      0.1
// @author       laplongejunior
// @match        https://www.testdome.com/cert/*
// @start-at     document-end
// ==/UserScript==

(function() {
    if (!location.href.indexOf("testdome.com/cert") < 0) return;
	var d = document;
	var v = d.getElementById('Verify');
	if (v !== null) {
		v.click();
		return;
	}

    alert("This page has been modified by a userscript!");
	var r = function(n){n.remove()};
	var b = d.body;
	b.querySelectorAll('.certificate').forEach(function(n){n.style='margin-top:0'});
	b.querySelectorAll(':scope > :not(.container)').forEach(r);
	b.querySelectorAll('.footer').forEach(r);

	var o = ['0','1','2','3','4','5','6','7','8','9','-','.','_','~'
	,'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
	,'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
	,':','/','?','#','[',']','@','!','$','&','\'','(',')','*','+',',',';','='];

	b.querySelectorAll('.text-center').forEach(function(n) {
		if (n.classList.contains('certificate')) return;
		for (var c of Array.from(n.children)) {
			if (!c.classList.contains('certificate-url')) {
				r(c);
				continue;
			}

			for (var n of Array.from(c.childNodes)) {
				var t = c.textContent;
				var i = t.indexOf('https');
				var j = t.indexOf('http');
				if (i === -1 || i < j)
					i = j;
				if (i == -1) continue;
				r(n);

				c.appendChild(d.createTextNode(t.substring(0,i)));
				t = t.substring(i);
                i = (function() {
                    for (var i = 0, l = t.length; i < t; ++i)
						if (!o.contains(t.charAt(i)))
							return i;
					return -1;
				})();

				var u = (i == -1) ? t : t.substring(0,i);
				var a = d.createElement('a');
				a.appendChild(d.createTextNode(u));
				a.href=u;
				a.style='color:inherit;text-decoration:inherit';
				c.appendChild(a);

				if (i != -1)
					c.appendChild(d.createTextNode(t.substring(i)));
			}
		}
	});
	//print();
})();
