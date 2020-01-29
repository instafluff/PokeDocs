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

allPokemonKnowledgeBasesAreBelongToUs();

// const Web = require( "webwebweb" );
// Web.Run( 12920 );
