const fs = require("fs");
const rdfParser = require("rdf-parse").default;
const n3 = require("n3");
const datafactory = n3.DataFactory;
const Engine = require("@comunica/query-sparql").QueryEngine;
const engine = new Engine();
const storeStream = require("rdf-store-stream").storeStream;
let store = new n3.Store();
const SparqlClient = require('sparql-http-client');
let quadStream;

async function start() {

  const acusticNN = datafactory.namedNode("http://example.com/tutorial/Acustic");
  const fenomentalNN = datafactory.namedNode("http://example.com/tutorial/Fenomental");
  const typeNN = datafactory.namedNode("http://example.com/tutorial/type");
  const nameNN = datafactory.namedNode("http://example.com/tutorial/name");
  const albumNN = datafactory.namedNode("http://example.com/tutorial/Album");
  const acusticL = datafactory.literal('Acustic');
  const fenomentalL = datafactory.literal('Fenomental');

  const quadAcusticType = datafactory.quad(
    acusticNN,  // subject
    typeNN,     // predicate
    albumNN     // object
    );
  const quadAcusticName = datafactory.quad(acusticNN, nameNN, acusticL);
  const quadFenomentalType = datafactory.quad(fenomentalNN, typeNN, albumNN);
  const quadFenomentalName = datafactory.quad(fenomentalNN, nameNN, fenomentalL);


  let store = new n3.Store();
  store.addQuads([quadAcusticType, quadAcusticName, quadFenomentalType, quadFenomentalName]);


  console.log(store.size);
  console.log(store.getQuads());

  // search for quads that have object == albumNN
  quadStream = store.match(
      null, null, albumNN
  )

  // process streams with callbacks
  quadStream
    .on('error', console.error)
    .on('data', (quad) => {
      console.log("Quad that have object == Album");
      console.log(quad);
    })
    .on('end', () => console.log('Programmatic quads done!'));

  
  // search for quads that have predicate == nameNN
  quadStream = store.match(
    null, nameNN, null
  )

  // process result stream with rdf-store-stream
  let newStore = await storeStream(quadStream);
  console.log("Quads that have predicate === nameNN");
  console.log(newStore.getQuads());


  console.log("iterating over quads with subject === acusticNN")
  newStore.forEach(
    (quad) => {
      console.log(quad);
    },                  // callbackfn
    acusticNN,          // subject
    null,               // predicate
    null                // object
  )

  // delete quad
  newStore.delete(quadFenomentalName);
  console.log("Does quad exist anymore in graph?", newStore.has(quadFenomentalName));
  console.log(newStore.getQuads());

  // read from file
  quadStream = rdfParser.parse(fs.createReadStream('vitadevie.ttl'),
  { contentType: 'text/turtle' })
  store = await storeStream(quadStream);

  // query data with sparql
  let bindingsStream = await engine.queryBindings(`
      PREFIX : <http://example.com/tutorial/>
    SELECT *
  {
    ?album :type :Album .
    ?album :artist ?artist .
    ?artist :type :SoloArtist .
  }`, {
    sources: [store],
  });
  bindingsStream.on('data', (data) => {
    console.log("Query result quad info:");
    console.log(data.get('album'));
    console.log(data.get('artist'));
  });
  bindingsStream.on('end', () => console.log('Done with getting data using SPARQL query!'));

  // execute an insert query
  await engine.queryVoid(`
    PREFIX : <http://example.com/tutorial/>
    INSERT DATA
    {
      :Smiley :type :SoloArtist
    }
  `, { sources:[store] });

  bindingsStream = await engine.queryBindings(`
    PREFIX : <http://example.com/tutorial/>
    SELECT *
  {
    ?name :type :SoloArtist
  }`, {
    sources: [store],
  });

  let bindings = await bindingsStream.toArray();
    console.log("All artists in the store");
    bindings.forEach((quad) => {
      console.log(quad.get('name'));
  });

  // execute an update (delete/insert in sparql)
  await engine.queryVoid(`
    PREFIX : <http://example.com/tutorial/>
    DELETE { :Smiley :type :SoloArtist }
    INSERT { :Cezar_Popescu :type :SoloArtist }
    WHERE
    {
      :Smiley :type :SoloArtist
    }`, {
      sources: [store],
  });

  bindingsStream = await engine.queryBindings(`
  PREFIX : <http://example.com/tutorial/>
  SELECT *
  {
    ?name :type :SoloArtist
  }`, {
    sources: [store],
  });

  bindings = await bindingsStream.toArray();
  console.log("All good artists in the store");
  bindings.forEach((quad) => {
    console.log(quad.get('name'));
  });

  // Using client to query RDF data
  const client = new SparqlClient({ endpointUrl: 'https://query.wikidata.org/sparql' });
  const clientResult = await client.query.ask(
    'ASK { <http://www.wikidata.org/entity/Q54872> ?p ?o }'
    );
  console.log("Result from SPARQL endpoint", clientResult);

  // from quads to a string serialized in ttl format
  const writer = new n3.Writer({ prefixes: { c: 'http://example.com/tutorial/'}});
  writer.addQuads(store.getQuads());
  writer.end((error, result) => {
    console.log("Quads serialized to string");
    console.log(result);
  });

  // from quads to a file
  let result = fs.createWriteStream('serialized.ttl');
  const writerStream = new n3.Writer(result, { end: false, prefixes: { c: 'http://example.com/tutorial/'}});
  writerStream.addQuads(store.getQuads());
  writerStream.end();

}

start();