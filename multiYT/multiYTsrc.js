// Call multiYT_schedulePlayer with an existing dom node, an array of array representing the video fragments and a boolean on true if the video must start now
// This script will create two YT players and will hide/show the secondary one when needed
// That allows to show several fragments of videos in sequence as the other viewer pre-buffered the following fragment
// Content of the fragment array : 
// For each fragment, an array with the YT id, the start second and the end second
// If you want to represent a *length* rather than the end, use a negative number (-3 means 3 seconds later)
// For a Proof Of Concept, see https://github.com/laplongejunior/laplongejunior.github.io/blob/master/test/multiyt.html

(function(global){
	"strict mode";
	
	// Entry-point
	var isStarted = false;
	var initCache = new Map();
	global.multiYT_schedulePlayer = function(node,schedule,autoPlay) {
		if (isStarted)
			MultiPlayer(node,schedule,autoPlay);
		else
			initCache.set(node,[schedule,autoPlay]);
	};
	
	// This method's scope stare the data about specific duos of viewers
	var lastID = 0;
	const MultiPlayer = function(container, schedule, autoPlay) {
		// Only optimized for two players
		const PLAYER_CACHE = 2;
		var players = new Array();
		
		var ready = 0;
		const readyCheck = ()=>{
			if (++ready === PLAYER_CACHE) initMulti(autoPlay);
		};
		
		const PREFIX = "ytPlayer";
		for (var i=0; i<PLAYER_CACHE; ++i) {
			// TODO: Random id!
			const id = PREFIX+(++lastID);
			
			// To avoid flickering, we'll initially load the YT player in an hidden element
			var mask = document.createElement('span');
			container.appendChild(mask);
			mask.style.display = 'none';
			
			// Youtube will automatically replace this div by their iframe player
			var player = document.createElement('div');
			player.id = id;
			mask.appendChild(player);
			
			players.push(_fixYTplayer(id, (e)=>{
				readyCheck();			
				const element = e.target.getIframe();
				element.style.display = (i===0 ? 'initial':'none');
				// Moving the video breaks loading
				//document.getElementById(playerID).replaceChild(element,element.parentNode);
				// So we'll simply show again the temporary storage
				element.parentNode.style.display = 'initial';
			}));
		}
	
		var nextID = 0;
		// Allows to start the first YT player
		// The player afer that will start buffering for a better UI effect
		const initMulti = function(autoPlay) {
			var params = schedule.shift();
			const player = players[nextID];
			_singleCallEvent(player,'onStateChange',()=>loadNext(false));				
			loadSegment(player, params[0], params[1], params[2], autoPlay);
		}
		
		var last = false;
		// Will start the next video player
		// If there's another video after that, the next player will start buffering 
		const loadNext = function(play) {
			if (last) return;
			
			var params = schedule.shift();		
			if (!params) last = true;
			if (play) playSegment(players[nextID], !last, true);
			if (last) return;
			
			nextID++;
			if (nextID === PLAYER_CACHE) nextID = 0;
			var player = players[nextID];
			loadSegment(player, params[0], params[1], params[2], false);
		}
		
		// Object-stated hooks to the stateless methods
		const loadSegment = function(player, id, start, end, play) {
			_loadSegment(player, id, start, end, play, ()=>loadNext(true));
		}
		const playSegment = function(player, next, autoPlay) {
			_playSegment(player, autoPlay, next ? ()=>loadNext(true) : null);
		}
	}
	
	// Global methods not depending on the current state	
	/**
		Loads the Youtube player to show a segment of a video
		Also, the player will start buffering in order to start seamlessly
    		If end is negative, it is interpretered as the segment's length instead
	 */
	const _loadSegment = function(player, id, start, end, play, callback) {
		_singleCallEvent(player, 'onStateChange', e=>{
			_playSegment(player, play, callback);
		});
    
    		if (end < 0) end = start - end;
		player.cueVideoById({
			'videoId': id,
			'startSeconds': start,
			'endSeconds': end,
			'suggestedQuality': 'large'});
	}
	
	/**
		Triggers the buffering of a video playerID
		If autoplay is set, the player is shown in order to show the next video
		If a callback is defined, this player will be hidden at the end of the segment
		It is assumed the callback will be used to start the next video
	 */
	const _playSegment = function(player, autoPlay, callback) {
		player.playVideo();	
		// Trigger buffering
		if (!autoPlay) {
			_singleCallEvent(player,'onStateChange',()=>{
				player.pauseVideo();
			});	
			return;
		}
		
		// If the player is going to start, show it
		player.getIframe().style.display = 'initial';
		
		// Hides the player when the video stops
		if (!callback) return;
		_singleCallEvent(player, 'onStateChange', e=>{
			// Stopped state only
			if (e.data !== 0) return true;
			callback(e);
			e.target.getIframe().style.display = 'none';
		});
	}
	
	/**
		Add a function to the event listeners of an object
		If said function returns a falsy value (including undefined), the event is removed
		In practice, if a condition requires to NOT remove the event, it should return true
	 */
	const _singleCallEvent = function(object, name, func) {
		const CALL = event=>{
			if (func(event)) return;
			object.removeEventListener(name, CALL);
		};
		object.addEventListener(name, CALL);
	}
	
	/**
		Create a Youtube player object with the ability to add several listeners
		The add/remove listeners methods from the original objects only handle one event at a time
		(Behind the scenes, youtube's listener is stored using the global object)  
	 */
	const _fixYTplayer = function(id,onReady) {			
		const YTplayer = new YT.Player(id, {events: {
			'onReady': onReady,				
			// The YT override addEventListener in such a way only one event can be hooked at a time
			// To polyfill that issue, we'll implement a listeners list ourselves
			'onStateChange': e=>{
				var listeners = e.target._listeners.get('onStateChange');
				if (listeners) listeners.forEach(func=>func(e));
			}
		}});

		// List of listeners for onStateChange
		// It's done in a way we can add other events later, but not needed for now
		YTplayer._listeners = new Map();
		YTplayer.addEventListener = (name, callback) => {
			var listeners = YTplayer._listeners.get(name);
			if (!listeners) YTplayer._listeners.set(name, listeners = new Array());
			listeners.push(callback);
		};
		YTplayer.removeEventListener = (name, callback) => {
			var listeners = YTplayer._listeners.get(name);
			if (listeners)
				listeners.splice(listeners.indexOf(callback),1);
		};
		return YTplayer;
	}
	
	// Wait until both the page and the YT api finished loading
	var remaining = 2;
	const whenReady = function() {
		if (--remaining > 0) return;
		alert("YES");
		isStarted = true;
		for (var pair of initCache) {
			const temp = pair[1];
			console.log(document);
			MultiPlayer(pair[0],temp[0],temp[1]);
		}
		initCache = undefined;
	};
	
	_singleCallEvent(global, 'load', function() {
		whenReady();
	});
	// Global object name reserved by YT api
	global.onYouTubeIframeAPIReady = function() {
		global.onYouTubeIframeAPIReady = undefined;
		whenReady();
	}
	
	// Load the YT api synchronically (tends to take A LOT of time to setup itself)
	const _async = function() {
		var tagName = arguments[0];
		var tag = document.createElement(tagName);
		var length = arguments.length;
		for (var i = 1; i+1 < length; i+=2)
			tag[arguments[i]] = arguments[i+1];
		var first = document.getElementsByTagName(tagName)[0];
		first.parentNode.insertBefore(tag, first);
		return tag;
	}
	_async('script','src',"https://www.youtube.com/iframe_api");
})(this);
