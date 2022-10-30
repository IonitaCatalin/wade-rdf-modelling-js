const { factory, quad } = require('./create-rdf-quads.js');

const N3 = require('n3');
const store = new N3.Store();

store.addQuad(quad);

// Looking up Quads

const quadStream = store.match(
    factory.namedNode('https://www.rubensworks.net/#me')
  );
  quadStream
    .on('error', console.error)
    .on('data', (quad) => {
      console.log(quad);
    })
    .on('end', () => console.log('Done!'));