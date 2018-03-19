"use strict";

var grid = function(){
	this.id=grid.ID;
	grid.ID ++;

	this.scale=window.devicePixelRatio;
	this.prevX;
	this.prevY;
	this.width=this.scale*window.innerWidth;
	this.height=this.scale*window.innerHeight;
	this.cvs;
	this.ctx;
	this.createCanvas();
};
grid.ID=0;

grid.prototype.extendBody = function(x, y){
	var oldCvs = this.cvs;
	this.width += this.scale * Math.abs(x);
	this.height += this.scale * Math.abs(y);
	this.createCanvas();
	var offsetX = (0<x)?0:-x;
	var offsetY = (0<y)?0:-y;
	this.ctx.drawImage(oldCvs, offsetX, offsetY);
	window.scrollBy(offsetX/this.scale, offsetY/this.scale);
	document.body.removeChild(oldCvs);
}

grid.prototype.createCanvas = function(){
	var x = this.width;
	var y = this.height;
	var canvas = document.createElement("canvas");
	canvas.id = this.id + "ctx";
	canvas.width = x;
	canvas.height = y;
	canvas.style.width = (x/this.scale)+"px";
	canvas.style.height = (y/this.scale) + "px";
	document.body.appendChild(canvas);
	var ctx = canvas.getContext("2d");
	ctx.fillStyle = "rgba(0,0,0,1)";
	canvas.addEventListener("mousedown", down);
	canvas.addEventListener("mouseup", up);
	canvas.addEventListener("touchstart", tdown);
	canvas.addEventListener("touchend", up);
	canvas.addEventListener("mousemove", move);
	canvas.addEventListener("touchmove", tmove);
	this.ctx=ctx;
	this.cvs=canvas;
}

grid.prototype.draw = function(x, y){
	x *= this.scale;
	y *= this.scale;
	this.ctx.moveTo(this.prevX, this.prevY);
	this.ctx.lineTo(x, y);
	this.ctx.stroke();
	this.prevX = x;
	this.prevY = y;
}

grid.prototype.move = function(x, y){
	x *= this.scale;
	y *= this.scale;
	this.prevX = x;
	this.prevY = y;
	this.ctx.moveTo(x, y);
}
