
/*
 * ******************************************************************************
 *  jquery.mb.components
 *  file: extract.js
 *
 *  Copyright (c) 2001-2013. Matteo Bicocchi (Pupunzi);
 *  Open lab srl, Firenze - Italy
 *  email: matteo@open-lab.com
 *  site: 	http://pupunzi.com
 *  blog:	http://pupunzi.open-lab.com
 * 	http://open-lab.com
 *
 *  Licences: MIT, GPL
 *  http://www.opensource.org/licenses/mit-license.php
 *  http://www.gnu.org/licenses/gpl.html
 *
 *  last modified: 02/10/13 22.42
 *  *****************************************************************************
 */

buildBookletPage=function(el){
  var page= new Object();
  page.layout=new Object();

  page.articles= new Object();
  page.articles.big = [];
  page.articles.gallery = [];
  page.articles.note = [];
  page.articles.quote = [];

  page.weight=0;

  jQuery.each( $(el), function() {
    if (page.weight>10 || analyzeArticle(this).weight==0) return;

    var article= new Object();
    article.weight= analyzeArticle(this).weight;
    article.type= this.type;
    article.owner= this.ownerName;
    article.publisheDate= this.date;
    article.title= this.title;
    article.ownerGravatar="http://www.gravatar.com/avatar/"+this.ownerEmail_md5+"?s=40&d=identicon";
    article.content = this.pageSource?$(this.pageSource).articolize():this.notes?this.notes:"";
    article.images= analyzeArticle(this).images;

    var htmlImages= $(article.content).find("img");
    htmlImages.each(function(){
      getImgDim(
              $(this).attr("src"),
              function(w,h){
                if (w>=400)
                  article.images.push($(this).attr("src"));
                if(article.weight<10) article.weight+=1;
              })
    });
    alert([article.type, article.owner,article.title, article.weight, article.images]);

    page.articles.push(article);
    page.weight+=article.weight;
  });
};

function analyzeArticle(strip) {

  var article= new Object();
  article.images = new Array();
  article.weight=0;

  switch(strip.type) {

    case 'IMAGE':
      var images=strip.images.split(",");
      article.weight= images && images.length>5?8:1;
      article.images=images;
      break;

    case 'BOOKMARK':
      article.weight=2;
      break;

    case 'TODO':
      article.weight=1;
      break;

    case 'NOTE':
      article.weight=2;
      break;

    case 'IDEA':
      article.weight=3;
      break;

    case 'CONTACT_COMPANY':
    case 'CONTACT_PERSON':
    case 'MILESTONE':
    case 'APPOINTMENT':
    case 'REMINDER':
    case 'BUDGET':
    case 'COST':
    case 'EFFORT':
    case 'OUTCOME':
      article.weight=0;
      break;

    default:
      article.weight=0;
      break;
  }

  return article;
}

// this js has been freely adapted from readability.js

var ExtractRegexps= {
  unlikelyCandidatesRe:   /combx|comment|disqus|foot|header|menu|meta|nav|rss|shoutbox|sidebar|sponsor/i,
  okMaybeItsACandidateRe: /and|article|body|column|main/i,
  positiveRe:             /article|body|content|entry|hentry|page|pagination|post|text/i,
  negativeRe:             /combx|comment|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|tags|widget/i,
  divToPElementsRe:       /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
  replaceBrsRe:           /(<br[^>]*>[ \n\r\t]*){2,}/gi,
  replaceFontsRe:         /<(\/?)font[^>]*>/gi,
  trimRe:                 /^\s+|\s+$/g,
  normalizeRe:            /\s{2,}/g,
  killBreaksRe:           /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
  videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i
};

$.fn.articolize=function() {
  var content= $(this);
  //remove not useful elements
  content.find('script').remove();
  content.find('style').remove();
  content.find('iframe').remove();
  content.find('form').remove();

  //  transform all DIVs without nested element in P
  var divs= content.find("div");
  divs.each(function(){
    var node=$(this).get(0);
    var $node=$(this);
    if(node.innerHTML.search(ExtractRegexps.divToPElementsRe) === -1){
      var content=$node.html();
      var newContent= $("<p/>").html(content);
      $node.replaceWith(newContent);
    }
  });


  //remove empty elements
  var emptyEl= content.find("div, span, p, hr, br").is(":empty");
  emptyEl.each(function(){
    var $node=$(this);
    var node=$(this).get(0);
    if($node.is(":empty"))
      $node.remove();

  });

  //remove style from tags
  var styled= content.find("[style]");
  styled.each(function(){
    var $node=$(this);
    var node=$(this).get(0);
    $node.removeAttr("style");
  });

  //remove class from tags
  var classed= content.find("[class]");
  styled.each(function(){
    var $node=$(this);
    var node=$(this).get(0);
    $node.removeAttr("class");
  });

  var allParagraphs = content.find("p");

  var candidates = [];
  for (var j=0; j	< allParagraphs.length; j++) {
    var parentNode      = allParagraphs[j].parentNode;
    var grandParentNode = parentNode.parentNode;
    var innerText       = getInnerText(allParagraphs[j]);

    /* If this paragraph is less than 25 characters, don't even count it. */
    if(innerText.length < 25)
      continue;

    /* Initialize readability data for the parent. */
    if(typeof parentNode.readability == 'undefined'){
      initializeNode(parentNode);
      candidates.push(parentNode);
    }

    /* Initialize readability data for the grandparent. */
    if(typeof grandParentNode.readability == 'undefined'){
      initializeNode(grandParentNode);
      candidates.push(grandParentNode);
    }

    var contentScore = 0;

    /* Add a point for the paragraph itself as a base. */
    contentScore++;

    /* Add points for any commas within this paragraph */
    contentScore += innerText.split(',').length;

    /* For every 100 characters in this paragraph, add another point. Up to 3 points. */
    contentScore += Math.min(Math.floor(innerText.length / 100), 3);

    /* Add the score to the parent. The grandparent gets half. */
    parentNode.readability.contentScore += contentScore;
    grandParentNode.readability.contentScore += contentScore/2;
  }
  var topCandidate = null;
  for(var i=0, il=candidates.length; i < il; i++) {
    /**
     * Scale the final candidates score based on link density. Good content should have a
     * relatively small link density (5% or less) and be mostly unaffected by this operation.
     **/
    candidates[i].readability.contentScore = candidates[i].readability.contentScore * (1 - getLinkDensity(candidates[i]));

    // console.debug('Candidate: ' + candidates[i] + " (" + candidates[i].className + ":" + candidates[i].id + ") with score " + candidates[i].readability.contentScore);

    if(!topCandidate || candidates[i].readability.contentScore > topCandidate.readability.contentScore)
      topCandidate = candidates[i];
  }
  //   console.debug(topCandidate)
  return  topCandidate;
};

/**
 * Initialize a node with the readability object. Also checks the
 * className/id for special names to add to its score.
 *
 **/
function initializeNode (node) {
  node.readability = {"contentScore": 0};

  switch(node.tagName) {
    case 'DIV':
      node.readability.contentScore += 5;
      break;

    case 'PRE':
    case 'TD':
    case 'BLOCKQUOTE':
      node.readability.contentScore += 3;
      break;

    case 'ADDRESS':
    case 'OL':
    case 'UL':
    case 'DL':
    case 'DD':
    case 'DT':
    case 'LI':
    case 'FORM':
      node.readability.contentScore -= 3;
      break;

    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
    case 'TH':
      node.readability.contentScore -= 5;
      break;
  }

  return node.readability.contentScore += getClassWeight(node);
}

/**
 * Get the inner text of a node - cross browser compatibly.
 * This also strips out any excess whitespace to be found.
 *
 **/
function getInnerText (e, normalizeSpaces) {
  var textContent    = "";

  normalizeSpaces = (typeof normalizeSpaces == 'undefined') ? true : normalizeSpaces;

  if (navigator.appName == "Microsoft Internet Explorer")
    textContent = e.innerText.replace( ExtractRegexps.trimRe, "" );
  else
    textContent = e.textContent.replace( ExtractRegexps.trimRe, "" );

  if(normalizeSpaces)
    return textContent.replace( ExtractRegexps.normalizeRe, " ");
  else
    return textContent;
}

/**
 * Get an elements class/id weight. Uses regular expressions to tell if this
 * element looks good or bad.
 *
 **/
function getClassWeight (node) {
  var weight = 0;

  /* Look for a special classname */
  if (node.className != "") {
    if(node.className.search(ExtractRegexps.negativeRe) !== -1)
      weight -= 25;

    if(node.className.search(ExtractRegexps.positiveRe) !== -1)
      weight += 25;
  }

  /* Look for a special ID */
  if (typeof(node.id) == 'string' && node.id != "") {
    if(node.id.search(ExtractRegexps.negativeRe) !== -1)
      weight -= 25;

    if(node.id.search(ExtractRegexps.positiveRe) !== -1)
      weight += 25;
  }
  return weight;
}

/**
 * Get the density of links as a percentage of the content
 * This is the amount of text that is inside a link divided by the total text in the node.
 *
 **/
function getLinkDensity (node) {
  var links      = node.getElementsByTagName("a");
  var textLength = getInnerText(node).length;
  var linkLength = 0;
  for(var i=0, il=links.length; i<il;i++)
    linkLength += getInnerText(links[i]).length;

  return linkLength / textLength;
}

function getImgDim(url,callBack){
  var img=$("<img>").attr({src:url}).load(function(){
    img.hide();
    $("body").append(img);
    img.remove();
    if(callBack) callBack(img.width(),img.height());
    //    return {width:img.width(), height:img.height()}
  });
}

