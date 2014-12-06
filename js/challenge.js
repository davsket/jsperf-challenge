(function(){
	var byId = document.getElementById.bind( document ),
		urlScr1 = byId( 'script1' ),
		urlScr2 = byId( 'script2' ),
		results = byId( 'results' ),
		$spinner = $('.spinner'),
		exposedScripts = [],
		resultTempl = doT.template(byId( 'result-template' ).innerHTML),
		val,
		result,
		failureNotifications = {},
		urlsRegs = [
				/https?\:\/\/gist\.github\.com\/\w+\/(\w+)/,
				/https?:\/\/gist\.githubusercontent\.com\/\w+\/(\w+)\/raw\/\w+/,
				/https?:\/\/gist\.github.com\/(\w+)\.git/
			],
		a = document.createElement('audio'),
		$summon = $('#summon')

	$('#match').on('click', function(){
		$spinner.addClass('visible')
		// $('html, body').animate({
		// 	scrollTop: $spinner.offset().top
		// }, 'fast')
		val = getValue( byId('val').value )
		result = getValue( byId('result').value )
		getScripts()
	})
	$('#add-script').on('click', function(){
		$('<div class="vs">vs</div><input type="url">').appendTo('#scripts')
		return false
	})
	$summon.on('click', function(){
		playSound('summon')
	})

	function getValue( val ){
		try{
			return JSON.parse( val )
		}catch( e ){
			return isNaN( val ) ? val : +val
		}
	}
	
	function getScripts(){
		results.innerHTML = ''

		$.when.apply($, $('#scripts input').map( function( i, input ){ 
				return getGist( input.value ) 
			}) )
			.done( function(){
				var resultsStr = '',
					content

				exposedScripts.length = 0

				for( gist of arguments ){
					exposeScript( gist )
				}

				for( script of exposedScripts ){
					content = script.gist.content
					content = content.replace(/\</g,'&lt;').replace(/\>/g,'&gt;')
					script.gist.contentSafe = content
					resultsStr += resultTempl( script.gist )
				}

				results.innerHTML = resultsStr
				Prism.highlightAll()

				playSound('start')
				$('html, body').animate({
					scrollTop: $spinner.offset().top
				}, 'fast')

				matchScripts()
			})
	}

	function getGist( url ){
		return getGistData( getGistId( url ) )
	}


	function getGistId( url ){
		for( regexp of urlsRegs ){
			if( regexp.test( url ) ) 
				return url.match( regexp )[1] 
		}
		throw 'Invalid gist URL: ' + url
	}

	function getGistData( id ){
		var def = $.Deferred()
		$.get( 'https://api.github.com/gists/' + id )
			.done( function( gistData ){
				var gist = _.toArray( gistData.files )[0]

				def.resolve({
					user: gistData.owner.login,
					content: gist.content,
					name: gist.filename,
					id: gistData.id
				})
			})
			.fail(function( e ){ def.reject(e) })

		return def
	}

	function exposeScript( gist ){
		var main

		eval('main = (function(){ ' +
				gist.content + '; return main }())')

		exposedScripts.push({
			gist: gist,
			main: function(){ 
				try{ 
					return main.apply(this, arguments)
				}catch(e){
					if( ! failureNotifications[gist.id] ){
						failureNotifications[gist.id] = true
						console.log('Script exception!', gist)
					}
					for(var i=0, t; i<9999999; i++){
						t *= i*i
					}
				}
			},
			index: exposedScripts.length
		})
	}

	function matchScripts(){
		var suite = new Benchmark.Suite,
			$resultElems = $('.result-gist .result-gist__time')

		for( script of exposedScripts ){
			console.log( script.index + '. ' + script.gist.user + ': ' + 
				script.gist.name, result, script.main( val ), event.target.id )
			if( result === script.main( val ) ){
				$($resultElems[script.index])
					.parent()
					.addClass('passed')
			}else{
				$($resultElems[script.index])
					.parent()
					.addClass('did-not-passed')
			}
			// console.log( val, '=>', script.main( val ) )
			suite.add( script.index + '. ' + script.gist.user + ': ' + 
				script.gist.name, (function(main, val){ return function(){ main(val) } }( script.main, val )) )
		}

		suite.on('cycle', function(event) {
				console.log(String(event.target))
				$resultElems[event.target.id - 1].innerHTML = String(event.target)
			})
			.on('complete', function() {
				$spinner.removeClass('visible')
				playSound('end')
				this.filter('fastest')
					.forEach( function( fast ){
						$resultElems[fast.id - 1]
							.parentNode
							.classList.add('faster')
					})
			})
			.run({ 'async': true })
	}

	function playSound( type ){
		a.pause()
		if( type == 'summon' ){
			a.src = 'audio/horn.mp3'
		}else if( type == 'start' ){
			a.src = 'audio/gong.mp3'
		}else{
			a.src = 'audio/bell.mp3'
		}
		a.play()
	}
}())