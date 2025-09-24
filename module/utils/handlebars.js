export function registerHandlebars() {
  Handlebars.registerHelper('pluralize', function (word, count) {
    if (typeof count !== 'number') count = Number(count) || 0;
    return count === 1 ? word : word + 's';
  });

  Handlebars.registerHelper('hasKey', function (obj, key) {
    return obj && Object.prototype.hasOwnProperty.call(obj, key);
  });

  Handlebars.registerHelper('repeat', function (str, count) {
    let result = '';
    for (let i = 0; i < count; i++) {
      result += str;
    }
    return new Handlebars.SafeString(result);
  });

  const attributeTilePartial = [
    '<div class="tile">',
    '  <div',
    '    class="pill rollable"',
    '    role="button"',
    '    tabindex="0"',
    '    data-action="roll-attr"',
    '    data-key="{{key}}"',
    '    title="{{title}}"',
    '  >',
    '    <i class="fas fa-dice-d20" aria-hidden="true"></i><span>{{label}}</span>',
    '  </div>',
    '  <div class="pair">',
    '    <input class="num chip" type="number" name="system.attributes.{{key}}.value" value="{{value}}" />',
    '    /',
    '    <input class="num chip" type="number" name="system.attributes.{{key}}.base" value="{{base}}" />',
    '  </div>',
    '</div>',
  ].join('\n');

  const fieldRowPartial = [
    '<div class="form-row">',
    '  <label class="item-label">{{label}}</label>',
    '  {{> @partial-block}}',
    '</div>',
  ].join('\n');

  Handlebars.registerPartial('lh-attribute-tile', attributeTilePartial);
  Handlebars.registerPartial('lh-field-row', fieldRowPartial);
}
