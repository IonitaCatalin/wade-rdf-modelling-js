
const rdfDataFactory = require('rdf-data-factory');
const factory = new rdfDataFactory.DataFactory();

const quad = factory.quad(
  factory.namedNode('https://www.rubensworks.net/#me'), // subject
  factory.namedNode('http://schema.org/name'),          // predicate
  factory.literal('Ruben')                              // object
);

module.exports = {
    factory,
    quad
}
