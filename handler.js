const exphbs = require('express-handlebars');

module.exports = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'main',
  // create custom helpers
  helpers: {
    alert(className, msg, token) {
      return `<div class="alert alert-${className}" role="alert">
          ${msg}
          <br>
          ${'Token :- ' + token}
        </div>`;
    },
    dateConverter(date) {
      return date.toString().slice(0, 15);
    },
    errorMessage(msg, className) {
      return `<div class="alert alert-${className}" role="alert">
      ${msg}
    </div>
      `;
    }
  }
});
