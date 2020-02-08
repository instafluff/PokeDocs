require( "dotenv" ).config();

const fs = require( "fs" );
const fetch = require( "node-fetch" );

async function retrievePokeData( numPokemon, startIndex = 0 ) {
	let data = [];
	for( let i = startIndex; i < startIndex + numPokemon; i++ ) {
		console.log( `Retrieving Pokémon #${i+1}...` );
		let pokedata = await fetch( `https://pokeapi.co/api/v2/pokemon/${i+1}` )
			.then( r => r.json() );
		let pokespecies = await fetch( `https://pokeapi.co/api/v2/pokemon-species/${i+1}` )
			.then( r => r.json() );
		data.push( {
			info: pokedata,
			species: pokespecies,
		} );
	}
	data.sort( ( a, b ) => a.info.id - b.info.id );
	return data;
}

function generateQuestions( pokemon ) {
	let QnA = [];
	let pokeName = pokemon.species.names.filter( x => x.language.name === "en" )[ 0 ].name;
	console.log( `Generating Questions for ${pokeName}` );
	QnA.push( {
		q: `What type of Pokémon is ${pokeName}?`,
		a: `${pokeName} is a ${pokemon.info.types.map( x => x.type.name ).join( "/" )} Pokémon.`,
	});
	QnA.push( {
		q: `How tall is ${pokeName}?`,
		a: `${pokeName} is ${pokemon.info.height / 10} meters tall.`,
	});
	QnA.push( {
		q: `Where can I find a ${pokeName}?`,
		a: pokemon.species.habitat ? `${pokeName} is commonly found in the ${pokemon.species.habitat.name}.` : `The location of ${pokeName} is unknown.`,
	});
	QnA.push( {
		q: `How much does ${pokeName} weigh?`,
		a: `The average ${pokeName} is about ${pokemon.info.weight / 10} kilograms.`,
	});
	QnA.push( {
		q: `What color is a ${pokeName}?`,
		a: `Usually, ${pokeName} is ${pokemon.species.color.name}.`,
	});
	QnA.push( {
		q: `Tell me about ${pokeName}.`,
		a: `${pokemon.species.flavor_text_entries.filter( x => x.language.name === "en" )[ 0 ].flavor_text}`,
	});
	return QnA;
}

async function generateKnowledgeBase( name, pokeStart, pokeEnd ) {
	let data = await retrievePokeData( pokeEnd - pokeStart + 1, pokeStart - 1 );
	let qnas = data.map( p => generateQuestions( p ) );
	let kb = "Question\tAnswer\tSource\tMetadata\n";
	qnas.forEach( ( qna, i ) => {
		qna.forEach( q => {
			kb += `${q.q}\t${q.a}\thttps://pokeapi.co/api/v2/pokemon/${pokeStart+i+1}\t{}\n`;
		});
	});
	// console.log( kb );
	console.log( `Writing KB to ${name}.tsv` );
	fs.writeFileSync( `${name}.tsv`, kb );
	console.log( "Finished!" );
}

function allPokemonKnowledgeBasesAreBelongToUs() {
	// Test
	generateKnowledgeBase( "pokedata_test", 1, 5 );
	// // Gen 1
	// generateKnowledgeBase( "pokedata_G1", 1, 151 );
	// // Gen 2
	// generateKnowledgeBase( "pokedata_G2", 152, 251 );
	// // Gen 3
	// generateKnowledgeBase( "pokedata_G3", 252, 386 );
	// // Gen 4
	// generateKnowledgeBase( "pokedata_G4", 387, 493 );
	// // Gen 5
	// generateKnowledgeBase( "pokedata_G5", 494, 649 );
	// // Gen 6
	// generateKnowledgeBase( "pokedata_G6", 650, 721 );
	// // Gen 7 (NOT IN POKEAPI YET as of 2020-01-29)
	// generateKnowledgeBase( "pokedata_G7", 722, 809 );
	// // Gen 8 (NOT IN POKEAPI YET as of 2020-01-29)
	// generateKnowledgeBase( "pokedata_G8", 810, 890 );
}

// allPokemonKnowledgeBasesAreBelongToUs();



// Code to download the pokemon images
const generationNames = [ "red-blue", "silver", "ruby-sapphire", "diamond-pearl", "black-white", "x-y" ];
const pokemonImageUrlFormat = `https://img.pokemondb.net/sprites/GENERATION/normal/POKEMON.png`;
const imagePath = "pokevision";
const download = require('image-downloader');

async function downloadPokemonImages( numPokemon, startIndex = 0 ) {
	let data = await retrievePokeData( numPokemon, startIndex );
	// console.log( data );
	data.forEach( p => {
		generationNames.forEach( (g, i) => {
			let url = pokemonImageUrlFormat.replace( "GENERATION", g ).replace( "POKEMON", p.info.name );
			download.image({
			  url: url,
			  dest: `${imagePath}/${("00" + p.info.id).slice(-3)}_${g}.png`
		  	});
		});
	} )
	// console.log( data );
}
// downloadPokemonImages( 151, 0 );



// Code to upload & tag images
const util = require('util');
const TrainingApiClient = require("@azure/cognitiveservices-customvision-training");
const PredictionApiClient = require("@azure/cognitiveservices-customvision-prediction");

const setTimeoutPromise = util.promisify(setTimeout);

const trainingKey = process.env.CUSTOM_VISION_KEY;
const predictionKey = process.env.CUSTOM_VISION_KEY;
const predictionResourceId = process.env.CUSTOM_VISION_RESOURCE_ID;
const endPoint = process.env.CUSTOM_VISION_ENDPOINT;
const projectId = process.env.CUSTOM_VISION_PROJECT_ID;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTagsForPokemon( numPokemon, startIndex = 0 ) {
	let data = await retrievePokeData( numPokemon, startIndex );
	let tagData = await fetch( `${endPoint}/customvision/v3.0/training/projects/${projectId}/tags`, {
						headers: {
							"Training-Key": trainingKey,
						}
					} )
					.then( r => r.json() );
	let tags = {};
	tagData.forEach( t => tags[ t.name ] = t );
	let timeIndex = 0;
	let promises = data.map( async p => {
		if( !tags[ p.info.name ] ) {
			await sleep( 1000 * timeIndex++ ); // Prevent Rate Limit
			// Create a new tag
			let tagData = await fetch( `${endPoint}/customvision/v3.0/training/projects/${projectId}/tags?name=${p.info.name}`, {
								method: "POST",
								headers: {
									"Training-Key": trainingKey,
								}
							} )
							.then( r => r.json() );
			// console.log( tagData );
			tags[ p.info.name ] = tagData;
		}
	} );
	await Promise.all( promises );
	console.log( tags );
}

// NOTE: Free Tier only supports max of 50 tags! S0 Tier supports up to 500.
// createTagsForPokemon( 50, 0 );

async function deleteTagsForPokemon( numPokemon, startIndex = 0 ) {
	let tagData = await fetch( `${endPoint}/customvision/v3.0/training/projects/${projectId}/tags`, {
						headers: {
							"Training-Key": trainingKey,
						}
					} )
					.then( r => r.json() );
	console.log( tagData );
	let promises = tagData.map( async t => {
		let tagData = await fetch( `${endPoint}/customvision/v3.0/training/projects/${projectId}/tags/${t.id}`, {
							method: "DELETE",
							headers: {
								"Training-Key": trainingKey,
							}
						} )
						.then( r => r.json() );
	} );
	await Promise.all( promises );
}
// deleteTagsForPokemon();

async function uploadPokemonImages( tags, numPokemon, startIndex = 0 ) {
	let data = await retrievePokeData( numPokemon, startIndex );
	// console.log( data );
	for( var d = 0; d < data.length; d++ ) {
		let p = data[ d ];
		for( var i = 0; i < generationNames.length; i++ ) {
			let g = generationNames[ i ];
			let filename = `${imagePath}/${("00" + p.info.id).slice(-3)}_${g}.png`;
			let tag = tags[ p.info.name ];
			// console.log( tags, p.info.name );
			await sleep( 1000 ); // Prevent hitting 2 transactions per 1 sec rate limit
			let result = await fetch( `${endPoint}/customvision/v3.0/training/projects/${projectId}/images?tagIds[]=${tag.id}`, {
								method: "POST",
								body: fs.readFileSync(filename),
								headers: {
									"Training-Key": trainingKey,
									'Content-Type': 'application/octet-stream',
								}
							} )
							.then( r => r.json() );
							// console.log( result.images[ 0 ].image );
		};
	};
}

async function uploadPokemon() {
	let tagData = await fetch( `${endPoint}/customvision/v3.0/training/projects/${projectId}/tags`, {
						headers: {
							"Training-Key": trainingKey,
						}
					} )
					.then( r => r.json() );
	let tags = {};
	tagData.forEach( t => tags[ t.name ] = t );

	for( var i = 0; i < 50; i++ ) {
		// console.log( "Uploading: " + i );
		await uploadPokemonImages( tags, 1, i );
	}
}

uploadPokemon();


// const Web = require( "webwebweb" );
// Web.Run( 12920 );
