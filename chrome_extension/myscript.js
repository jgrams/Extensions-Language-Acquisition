// This function gets all the text in browser
function getText(words, sentences) {
	$("body :not(iframe)").textFinder(function() {
		var str = this.data.replace(/\s{2,}/gm, " ").replace(/(\D*)(\d+)(\D*)/gi,"");
		Array.prototype.push.apply(words, str.split(/[\u0000-\u001F\u0021-\u0026\u0028-\u0040\u005B-\u0060\u007B-\u00BF\u2000-\u206F\u2E00-\u2E7F\s]+/));
		Array.prototype.push.apply(sentences, str.split(/[\u0000-\u001F\u0021-\u0026\u0028-\u0040\u005B-\u0060\u007B-\u00BF\u2000-\u206F\u2E00-\u2E7F]+/));
	});
}

// Get the saved translation level.
var tranLimit = 5;
chrome.storage.sync.get("TRAN_LEVEL", function (limit) {
	if(limit["TRAN_LEVEL"]) {
		tranLimit = parseInt(limit["TRAN_LEVEL"]);
	}
	
	var alltext = [], sentences = [];
	getText(alltext, sentences); // gets browser text into words and sentences
	
	if(sentences.length == 0 || alltext.length == 0) {
		return;
	}
	
	var cleanArray = [];
	for (i in sentences){
		if(sentences[i].trim() !== "") cleanArray.push(sentences[i].trim());
	};
	
	//split each "sentence" on space
	cleanSplit=[];
	for (i in cleanArray){
		cleanSplit.push(cleanArray[i].split(" "));
	}
	
	var json_to_Translate = JSON.stringify(cleanSplit),
	        json_parse = JSON.parse(json_to_Translate);
	console.log(json_parse);
	var translationReq = {type: "translation", requestObj: {json_parse}};
	chrome.runtime.sendMessage(translationReq, function(response) { 
		var jsonArr = response.merged_words;
		
		// change jsonArr from object to array in order to enable sorting
		var makeArray = Object.keys(jsonArr).map(function(index){
	        return [index,jsonArr[index]];
		});
		
		// sort array from longest string to shortest string thereby ensuring the
		// longest strings are replaced first
		
		makeArray.sort(function (a, b) {
			return b[0].length - a[0].length;
		});
		console.log(makeArray);
	    replaceText(makeArray);
	});
});

// replace function

function replaceText(makeArray) {
	$("body :not(iframe)").textFinder(function() {
		for (d in makeArray){				
			if(this.nodeType === 3) { // first pass of the iteration
				findAndReplace(this, makeArray[d][0], makeArray[d][1]);
			} else if(this.nodeType === 1 && this.childNodes && this.childNodes[0]) { // all other passes after the first iteration
				$(this).textFinder(function() {
					findAndReplace(this, makeArray[d][0], makeArray[d][1]);
				});
			}
		}
	});
}

function findAndReplace(node, matcher, replacement) {
	matcher = matcher.trim();
	var pattern = new RegExp("(^\|[\\u0000-\\u001F\\u0021-\\u0026\\u0028-\\u0040\\u005B-\\u0060\\u007B-\\u00BF\\u2000-\\u206F\\u2E00-\\u2E7F\\s])" + matcher + "(?=[\\u0000-\\u001F\\u0021-\\u0026\\u0028-\\u0040\\u005B-\\u0060\\u007B-\\u00BF\\u2000-\\u206F\\u2E00-\\u2E7F\\s]\|$)", "i");
    var match;
    var curNode = node;
    while (match = pattern.exec(curNode.data)) {
    	// Check if text is already wrapped
    	if (curNode.parentNode.className === "spkeasy"){
    		return;
    	}
    	else{		
	        // Create the wrapper span and add the matched text to it.
			var span = document.createElement('span');
			$(span).attr("title", matcher);
			$(span).attr("class","spkeasy");
			$(span).tooltip({
		      position: {
		          my: "center bottom-15",
		          at: "center top",
		          using: function( position, feedback ) {
		            $( this ).css( position );
		            $( "<div>" )
		              .addClass( "arrow" )
		              .addClass( feedback.vertical )
		              .addClass( feedback.horizontal )
		              .appendTo( this );
		          	}
		        },
		        open: function( event, ui ) {
		        	chrome.runtime.sendMessage({type: "tts", requestObj: replacement});
		        }
			});
			var middlebit, endbit;
			if(match[0].search(/[\u0000-\u001F\u0021-\u0026\u0028-\u0040\u005B-\u0060\u007B-\u00BF\u2000-\u206F\u2E00-\u2E7F\s]/g) == 0) {
				middlebit = curNode.splitText(match.index + 1);
				endbit = middlebit.splitText(match[0].length - 1);
			} else {
				middlebit = curNode.splitText(match.index);
				endbit = middlebit.splitText(match[0].length);
			}
	        span.appendChild(document.createTextNode(replacement));
	        middlebit.parentNode.replaceChild(span, middlebit);
	        curNode = endbit;
    	}
    }
}

// jQuery plugin to find and replace text
jQuery.fn.textFinder = function( fn ) {
    this.contents().each( scan );
    // callback function to scan through the child nodes recursively
    function scan() {
        var node = this.nodeName.toLowerCase();
        if( node === '#text' ) {
            fn.call(this);
        } else if( this.nodeType === 1 && this.childNodes && this.childNodes[0] && node !== 'script' && node !== 'textarea' && node !== 'iframe' ) {
            $(this).contents().each( scan );
        }
    }
    return this;
};