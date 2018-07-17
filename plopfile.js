const path = require('path');

const types = ['Package'];

const checkTypedName = (plop, type) => text => {
  const properName = plop.getHelper('properCase');
  const rv = properName(text);
  if (!type || text.toLowerCase().indexOf(type.toLowerCase()) > -1) {
    return rv;
  }
  return `${rv}${type}`;
};

const entry = plop => {
  types.forEach(t => {
    plop.setHelper(`check${t}Name`, checkTypedName(plop, t));
  });

  plop.setGenerator('package', {
    description: 'create a new package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: "what's the name for the package?"
      },
      {
        type: 'input',
        name: 'description',
        message: 'description to provide for the package.json'
      },
      {
        type: 'input',
        name: 'author',
        message: 'author to provide for the package.json'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{name}}/package.json',
        templateFile: '.plops/templates/package/package.json.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{name}}/src/index.js',
        templateFile: '.plops/templates/package/index.js.hbs'
      },
      {
        type: 'add',
        path: 'packages/{{name}}/.babelrc',
        templateFile: '.plops/templates/package/.babelrc.hbs'
      }
    ]
  });
};

module.exports = entry;
