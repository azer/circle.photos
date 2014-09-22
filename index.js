var Brick = require("brick");
var nets = require("nets");
var generateURLs = require("flickr-generate-urls");
var PlayfairDisplay = require("playfair-display");
var PTMono = require("pt-mono");
var PhotoView = require("flickr-photo-brick");
var on = require("on-off");
var debounce = require("debounce-fn");
var page = require("page");

module.exports = Brick(PlayfairDisplay, PTMono, {
  update: update,
  show: show,
  ready: ready,
  filter: filter,
  more: more,
  browse: browse,
  fail: fail
});

function update (photos, done) {
  if (photos.data) {
    photos.filter();
    return done();
  };

  photos.username || (photos.username = '46799990@N04');
  photos.index || (photos.index = 1);

  favs(photos.username, function (error, result) {
    if (error) return photos.fail(error);
    photos.data = result;
    photos.filter();
    done();
  });
}

function filter (photos) {
  photos.slice = photos.data.slice(0, photos.index * 15);

  photos.slice.forEach(function (p) {
    p.format = 'jpg';
    p.urls = generateURLs(p);
  });
}

function show (photos) {
  photos.children || (photos.children = {});

  photos.brick.bind('.photo', photos.slice.map(function (photo) {
    if (photos.children[photo.id]) return photos.children[photo.id];
    return (photos.children[photo.id] = PhotoView.New(photo));
  }));

  var grid = photos.brick.element.select('.photos');
  grid.removeClass('fail');
}

function browse (photos, username) {
  if (photos.username == username) return;

  var grid = photos.brick.element.select('.photos');
  grid.addClass('loading');
  grid.removeClass('fail');

  delete photos.children;
  delete photos.data;
  photos.username = username;
  photos.index = 0;

  photos.brick.refresh(function () {
    grid.removeClass('loading');
  });
}

function ready (photos) {
  var grid = photos.brick.element.select('.photos');
  grid.removeClass('loading');
  grid.removeClass('fail');

  var username = photos.brick.element.select('input.username');
  username.val(photos.username);
  username[0].focus();

  username.onKey('enter', function () {
    page('/' + username.val());
  });

  page('/', photos.index);
  page('/:name', function (ctx) {
    photos.browse(ctx.params.name);
  });

  page();
  page('/' + photos.username);

  var more = debounce(photos.more, 500);
  on(window, 'scroll', more);
  on(window, 'resize', more);
}

function fail (photos, error) {
  var grid = photos.brick.element.select('.photos');
  grid.addClass('fail');
  grid.removeClass('loading');
}

function more (photos) {
  if ((window.innerHeight + window.scrollY) < document.body.offsetHeight) return;

  console.log('loading more photos');

  photos.index++;
  photos.brick.refresh();
}

function favs (username, callback) {
  nets("http://circle/api/circle-favorites/" + username, function (err, resp, body) {
    if (err) return callback(err);

    var parsed;

    try {
      parsed = JSON.parse(body);
    } catch (err) {
      return callback(err);
    }

    if (parsed.error) return callback(new Error(parsed.error));

    callback(undefined, parsed.result);
  });
}
