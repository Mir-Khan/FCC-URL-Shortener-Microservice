"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var dns = require("dns");
var cors = require("cors");
var app = express();

// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true`
// by default, you need to set it to false.
// from mongoose docs
mongoose.set("useFindAndModify", false);

// Basic Configuration
var port = process.env.PORT || 3000;
// i added the connect
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
app.use(cors());

// my code
const bodyparser = require("body-parser");
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
// end of my code
app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});

// my code, above is FCC setup

// making the schema and model
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original: { type: String, required: true },
  short: Number
});
let Url = mongoose.model("Url", urlSchema);

// now using the post command
// regex for dns.lookup
const urlRegex = /https:\/\/|http:\/\//g;
app.post("/api/shorturl/new", (req, res) => {
  //had to shorten the url if it had https since dns.lookup won't work with that in it
  let urlInput = req.body.url;
  let dnsUrl = urlInput.replace(urlRegex, "");
  // for the get middleware later on
  if(!urlRegex.test(urlInput)){
    let beg = "https://";
    urlInput = beg + urlInput;
  };

  dns.lookup(dnsUrl, (err, addresses) => {
    if (err) {
      res.json({ error: "Invalid URL" });
    } else {
      let inputShort = 1;
      Url.findOne({})
        .sort({ short: "desc" })
        .exec((err, data) => {
          if (!err && data != undefined) {
            inputShort = data.short + 1;
          }
          if (!err) {
            Url.findOneAndUpdate(
              { original: urlInput },
              { original: urlInput, short: inputShort },
              { new: true, upsert: true },
              (err, saved) => {
                if (!err) {
                  res.json({ url: urlInput, short: inputShort });
                }
              }
            );
          }
        });
    }
  });
});

app.get("/api/shorturl/:input", (req, res) => {
  let input = req.params.input;
  Url.findOne({short: input}, (err, data) => {
    if(!err && data != undefined){
      res.redirect(data.original);
    }else{
      res.json({error: "Invalid URL"});
    }
  })
});
