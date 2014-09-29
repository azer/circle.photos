var Brick = require("brick");
var nets = require("nets");
var generateURLs = require("flickr-generate-urls");
var PlayfairDisplay = require("playfair-display");
var PTMono = require("pt-mono");
var PhotoView = require("flickr-photo-brick");
var on = require("on-off");
var debounce = require("debounce-fn");
var page = require("page");
var isNode = require("is-node");
var socket = require('./socket');
var defaultContent = require('./default.json');

module.exports = Brick(PlayfairDisplay, PTMono, {
  update: update,
  show: show,
  ready: ready,
  more: more,
  browse: browse,
  fail: fail
});

function update (photos, render) {
  photos.username || (photos.username = 'randypmartin');
  photos.index || (photos.index = 1);

  var username = photos.username;

  if (isNode) {
    addRows(photos, defaultContent);
    return render();
  }

  if (!photos.data && photos.subscribedTo != username) {
    photos.subscribedTo = username;

    socket.reset();
    socket.subscribe(slower(function (rows) {
      if (photos.username != username) return;
      addRows(photos, rows);
      render();
    }));

    console.log('get %s', username);
    socket.send(username);
  }

  if (photos.data && photos.renderedIndex != photos.index) {
    render();
  }
}

function show (photos) {
  photos.children || (photos.children = {});

  var slice = photos.data.slice(0, photos.index * 30);

  photos.renderedIndex = photos.index;

  photos.brick.bind('.photo', slice.map(function (photo) {
    if (photos.children[photo.id]) return photos.children[photo.id];
    return (photos.children[photo.id] = PhotoView.New(photo));
  }));
}

function browse (photos, username) {
  if (username == photos.username) return;

  console.log('browse %s', username);
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

  console.log('ready');

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

  more();
}

function fail (photos, error) {
  var grid = photos.brick.element.select('.photos');
  grid.addClass('fail');
  grid.removeClass('loading');
  photos.failed = true;
}

function more (photos) {
  if ((window.innerHeight + window.scrollY) < document.body.offsetHeight) return;

  photos.index++;
  photos.brick.refresh();
}

function username () {
  var theo = '46799990@N04';

  if (typeof document == 'undefined') return theo;

  return document.location.pathname.slice(1) || theo;
}

function addRows (photos, rows) {
  var initial = !photos.data;

  if (initial) {
    photos.data = unique(rows.map(modifyRow)).sort(sortByDate);
    return;
  }

  photos.data = unique(photos.data.concat(rows.map(modifyRow))).sort(sortByDate);
}

function slower (fn) {
  var queue;
  var timer;

  return function (event) {
    if (!event.data) return;

    if (!queue) {
      queue = [];
      fn(JSON.parse(event.data));
      return;
    }

    queue = queue.concat(JSON.parse(event.data));

    if (timer != undefined) return;

    timer = setTimeout(function () {
      var rows = queue;
      queue = [];
      timer = undefined;
      fn(rows);
    }, 1000);
  };
}

function sortByDate (a, b) {
  if (a.dateFaved > b.dateFaved) return -1;
  if (a.dateFaved < b.dateFaved) return 1;
  return 0;
}

function unique (rows) {
  var ids = {};

  return rows.filter(function (row) {
    if (ids[row.id]) return;
    return ids[row.id] = true;
  });
}

function modifyRow (row) {
  return {
    id: row.Id,
    title: row.Title,
    owner: row.Owner,
    favedBy: row.FavedBy,
    dateFaved: Number(row.DateFaved),
    farm: row.Farm,
    secret: row.Secret,
    server: row.Server,
    urls: generateURLs({
      id: row.Id,
      secret: row.Secret,
      server: row.Server,
      farm: row.Farm,
      format: 'jpg'
    })
  };
}
