/**
 * Created by Ludo Pulles on 2023-12-28.
 */


/*
 * Source: https://github.com/Kaiido/roundRect/blob/main/roundRect.js
 */
(()=>{"use strict";Path2D.prototype.roundRect??=roundRect;if(globalThis.CanvasRenderingContext2D){globalThis.CanvasRenderingContext2D.prototype.roundRect??=roundRect}if(globalThis.OffscreenCanvasRenderingContext2D){globalThis.OffscreenCanvasRenderingContext2D.prototype.roundRect??=roundRect}function roundRect(x,y,w,h,radii){if(![x,y,w,h].every(input=>Number.isFinite(input))){return}radii=parseRadiiArgument(radii);let upperLeft,upperRight,lowerRight,lowerLeft;if(radii.length===4){upperLeft=toCornerPoint(radii[0]);upperRight=toCornerPoint(radii[1]);lowerRight=toCornerPoint(radii[2]);lowerLeft=toCornerPoint(radii[3])}else if(radii.length===3){upperLeft=toCornerPoint(radii[0]);upperRight=toCornerPoint(radii[1]);lowerLeft=toCornerPoint(radii[1]);lowerRight=toCornerPoint(radii[2])}else if(radii.length===2){upperLeft=toCornerPoint(radii[0]);lowerRight=toCornerPoint(radii[0]);upperRight=toCornerPoint(radii[1]);lowerLeft=toCornerPoint(radii[1])}else if(radii.length===1){upperLeft=toCornerPoint(radii[0]);upperRight=toCornerPoint(radii[0]);lowerRight=toCornerPoint(radii[0]);lowerLeft=toCornerPoint(radii[0])}else{throw new RangeError(`${getErrorMessageHeader(this)} ${radii.length} is not a valid size for radii sequence.`)}const corners=[upperLeft,upperRight,lowerRight,lowerLeft];const negativeCorner=corners.find(({x,y})=>x<0||y<0);const negativeValue=negativeCorner?.x<0?negativeCorner.x:negativeCorner?.y;if(corners.some(({x,y})=>!Number.isFinite(x)||!Number.isFinite(y))){return}if(negativeCorner){throw new RangeError(`${getErrorMessageHeader(this)} Radius value ${negativeCorner} is negative.`)}fixOverlappingCorners(corners);if(w<0&&h<0){this.moveTo(x-upperLeft.x,y);this.ellipse(x+w+upperRight.x,y-upperRight.y,upperRight.x,upperRight.y,0,-Math.PI*1.5,-Math.PI);this.ellipse(x+w+lowerRight.x,y+h+lowerRight.y,lowerRight.x,lowerRight.y,0,-Math.PI,-Math.PI/2);this.ellipse(x-lowerLeft.x,y+h+lowerLeft.y,lowerLeft.x,lowerLeft.y,0,-Math.PI/2,0);this.ellipse(x-upperLeft.x,y-upperLeft.y,upperLeft.x,upperLeft.y,0,0,-Math.PI/2)}else if(w<0){this.moveTo(x-upperLeft.x,y);this.ellipse(x+w+upperRight.x,y+upperRight.y,upperRight.x,upperRight.y,0,-Math.PI/2,-Math.PI,1);this.ellipse(x+w+lowerRight.x,y+h-lowerRight.y,lowerRight.x,lowerRight.y,0,-Math.PI,-Math.PI*1.5,1);this.ellipse(x-lowerLeft.x,y+h-lowerLeft.y,lowerLeft.x,lowerLeft.y,0,Math.PI/2,0,1);this.ellipse(x-upperLeft.x,y+upperLeft.y,upperLeft.x,upperLeft.y,0,0,-Math.PI/2,1)}else if(h<0){this.moveTo(x+upperLeft.x,y);this.ellipse(x+w-upperRight.x,y-upperRight.y,upperRight.x,upperRight.y,0,Math.PI/2,0,1);this.ellipse(x+w-lowerRight.x,y+h+lowerRight.y,lowerRight.x,lowerRight.y,0,0,-Math.PI/2,1);this.ellipse(x+lowerLeft.x,y+h+lowerLeft.y,lowerLeft.x,lowerLeft.y,0,-Math.PI/2,-Math.PI,1);this.ellipse(x+upperLeft.x,y-upperLeft.y,upperLeft.x,upperLeft.y,0,-Math.PI,-Math.PI*1.5,1)}else{this.moveTo(x+upperLeft.x,y);this.ellipse(x+w-upperRight.x,y+upperRight.y,upperRight.x,upperRight.y,0,-Math.PI/2,0);this.ellipse(x+w-lowerRight.x,y+h-lowerRight.y,lowerRight.x,lowerRight.y,0,0,Math.PI/2);this.ellipse(x+lowerLeft.x,y+h-lowerLeft.y,lowerLeft.x,lowerLeft.y,0,Math.PI/2,Math.PI);this.ellipse(x+upperLeft.x,y+upperLeft.y,upperLeft.x,upperLeft.y,0,Math.PI,Math.PI*1.5)}this.closePath();this.moveTo(x,y);function toDOMPointInit(value){const{x,y,z,w}=value;return{x:x,y:y,z:z,w:w}}function parseRadiiArgument(value){const type=typeof value;if(type==="undefined"||value===null){return[0]}if(type==="function"){return[NaN]}if(type==="object"){if(typeof value[Symbol.iterator]==="function"){return[...value].map(elem=>{const elemType=typeof elem;if(elemType==="undefined"||elem===null){return 0}if(elemType==="function"){return NaN}if(elemType==="object"){return toDOMPointInit(elem)}return toUnrestrictedNumber(elem)})}return[toDOMPointInit(value)]}return[toUnrestrictedNumber(value)]}function toUnrestrictedNumber(value){return+value}function toCornerPoint(value){const asNumber=toUnrestrictedNumber(value);if(Number.isFinite(asNumber)){return{x:asNumber,y:asNumber}}if(Object(value)===value){return{x:toUnrestrictedNumber(value.x??0),y:toUnrestrictedNumber(value.y??0)}}return{x:NaN,y:NaN}}function fixOverlappingCorners(corners){const[upperLeft,upperRight,lowerRight,lowerLeft]=corners;const factors=[Math.abs(w)/(upperLeft.x+upperRight.x),Math.abs(h)/(upperRight.y+lowerRight.y),Math.abs(w)/(lowerRight.x+lowerLeft.x),Math.abs(h)/(upperLeft.y+lowerLeft.y)];const minFactor=Math.min(...factors);if(minFactor<=1){for(const radii of corners){radii.x*=minFactor;radii.y*=minFactor}}}}function getErrorMessageHeader(instance){return`Failed to execute 'roundRect' on '${getConstructorName(instance)}':`}function getConstructorName(instance){return Object(instance)===instance&&instance instanceof Path2D?"Path2D":instance instanceof globalThis?.CanvasRenderingContext2D?"CanvasRenderingContext2D":instance instanceof globalThis?.OffscreenCanvasRenderingContext2D?"OffscreenCanvasRenderingContext2D":instance?.constructor.name||instance}})();

/*******************************************************************************
 * Box is the object which manages the game visualisation.
 * This part makes sure that the board transitions can be made.
 * When the board is changed, it sends the board to all its controllers.
 ******************************************************************************/

function Box(playerNames, moves, ownColours) {
	this.playerNames = playerNames;
	this.isRunning = false;
	this.curMove = 0;
	this.H = 16;
	this.W = 20;
	this.tileSize = 36; // tile size
	this.padw = 32;
	this.padh = 38;
	this.fillColours = [ "#ff4444", "#ffff44", "#44ff44", "#44ffff", "#4444ff", "#ff44ff" ];
	this.lw = 2; // line width

	var p1 = document.getElementById('p1-score');
	var p2 = document.getElementById('p2-score');
	this.ownColours = ownColours;
	p1.style = 'background-color: ' + this.fillColours[this.ownColours[0] - 1];
	p2.style = 'background-color: ' + this.fillColours[this.ownColours[1] - 1];

	// Build the canvas, we are working with:
	canvases = document.getElementById('game-container').children;
	for (var i = 0; i < 2; i++) {
		canvas = canvases[i];
		canvas.width = this.padw + this.W * this.tileSize + this.lw;
		canvas.height = this.padh + this.H * this.tileSize + this.lw;
		canvas.style.width = (canvas.width) + "px";
		canvas.style.height = (canvas.height) + "px";
	}

	this.moves = moves;

	this.registerEvents();
	this.buildMoveTable();

	// Create the board:
	this.ctx = canvases[0].getContext('2d');
	this.ctx2 = canvases[1].getContext('2d');
	this.initCanvas();

	this.updateSelectedRow();
}

Box.prototype.initCanvas = function() {
	this.scores = [0, 0];
	this.board = Array(this.H);
	for (var i = 0; i < this.H; i++) {
		this.board[i] = Array(this.W);
		for (var j = 0; j < this.W; j++)
			this.board[i][j] = 0;
	}

	this.ctx.shadowBlur = 0;

	this.ctx.fillStyle = 'white';
	this.ctx.fillRect(0, 0, this.padw + this.W * this.tileSize + this.lw, this.padh + this.H * this.tileSize + this.lw);

	this.ctx.font = "bold 30px monospace";
	this.ctx.fillStyle = 'black';
	this.ctx.textAlign = "right";
	this.ctx.textBaseline = "middle";
	for (var i = 0; i < this.H; i++) {
		var label = String.fromCharCode(65 + i);
		this.ctx.fillText(label, this.padw - 6, this.padh + 4 + (0.5 + i) * this.tileSize);
	}

	this.ctx.textBaseline = "bottom";
	this.ctx.textAlign = "center";
	for (var i = 0; i < this.W; i++) {
		var label = String.fromCharCode(97 + i);
		this.ctx.fillText(label, this.padw + (0.5 + i) * this.tileSize, this.padh + 2);
	}

	this.ctx.textBaseline = "middle";
	this.ctx.textAlign = "center";
	this.ctx.lineWidth = this.lw;

	this.ctx.font = "20px monospace";
	this.ctx.fillStyle = '#333333';
	this.ctx.fillRect(this.padw - this.lw, this.padh - this.lw, this.tileSize * this.W + 2*this.lw, this.tileSize * this.H + 2*this.lw);
	this.drawTile(0, false);
	this.updateScores();

	this.ctx2.shadowOffsetX = this.ctx2.shadowOffsetY = 2;
	this.ctx2.shadowBlur = 3;
	this.ctx2.shadowColor = 'black';
	this.ctx2.lineWidth = this.lw;
	this.ctx2.font = "bold 16px monospace";
	this.ctx2.textBaseline = "middle";
	this.ctx2.textAlign = "center";
};

Box.prototype.updateScores = function() {
	var p1 = document.getElementById('p1-score');
	var p2 = document.getElementById('p2-score');

	var setText = function(elem, score, name) {
		if (score < 10) elem.innerText = name + ":   " + score;
		else if (score < 100) elem.innerText = name + ":  " + score;
		else elem.innerText = name + ": " + score;
	};

	setText(p1, this.scores[0], 'Player 1 (color ' + this.ownColours[0] + ')');
	setText(p2, this.scores[1], 'Player 2 (color ' + this.ownColours[1] + ')');
};

Box.prototype.highlight = function(row, col, l, p, delta) {
	this.pts[p][row  ][col  ] += delta * l;
	this.pts[p][row  ][col+l] += delta * l;
	this.pts[p][row+l][col  ] += delta * l;
	this.pts[p][row+l][col+l] += delta * l;
};

Box.prototype.addPossibleSquare = function(row, col, delta, indicate) {
	var p = -1;
	if (this.board[row][col] == this.ownColours[0]) p = 0;
	if (this.board[row][col] == this.ownColours[1]) p = 1;
	if (p === -1) return;

	var x = this.board[row][col];

	for (var i = 1; i <= col; i++) if (x == this.board[row][col - i]) {
		if (i <= row && x == this.board[row - i][col] && x == this.board[row - i][col - i]) {
			this.scores[p] += delta * i;
			if (indicate) this.highlight(row - i, col - i, i, p, delta);
		}
		if (row + i < this.H && x == this.board[row + i][col] && x == this.board[row + i][col - i]) {
			this.scores[p] += delta * i;
			if (indicate) this.highlight(row, col - i, i, p, delta);
		}
	}

	for (var i = 1; col + i < this.W; i++) if (x == this.board[row][col + i]) {
		if (i <= row && x == this.board[row - i][col] && x == this.board[row - i][col + i]) {
			this.scores[p] += delta * i;
			if (indicate) this.highlight(row - i, col, i, p, delta);
		}
		if (row + i < this.H && x == this.board[row + i][col] && x == this.board[row + i][col + i]) {
			this.scores[p] += delta * i;
			if (indicate) this.highlight(row, col, i, p, delta);
		}
	}
};

Box.prototype.setLocation = function(col, row, colour, indicate) {
	var x = Number(colour);

	this.ctx.shadowBlur = 0;
	this.ctx.fillStyle = this.fillColours[x - 1];
	this.ctx.fillRect(this.padw + col * this.tileSize, this.padh + row * this.tileSize, this.tileSize, this.tileSize);
	this.ctx.shadowBlur = 3;

	this.ctx.fillStyle = '#333';
	this.ctx.fillText(x, this.padw + (col + 0.5) * this.tileSize, this.padh + 4 + (row + 0.5) * this.tileSize);

	if (x != this.board[row][col]) {
		if (this.board[row][col] != 0)
			this.addPossibleSquare(row, col, -1, indicate);
		this.board[row][col] = x;
		this.addPossibleSquare(row, col, +1, indicate);
	}
};

// Draws one tile.
Box.prototype.drawTile = function(tile_nr, indicate) {
	tile = this.moves[tile_nr];
	var r1 = tile.charCodeAt(0) - 65, r2 = r1 + (tile[8] === 'v' ? 6 : 2);
	var c1 = tile.charCodeAt(1) - 97, c2 = c1 + (tile[8] !== 'v' ? 6 : 2);
	var rpx1 = this.padh + r1 * this.tileSize, hei = (r2 - r1) * this.tileSize;
	var cpx1 = this.padw + c1 * this.tileSize, wid = (c2 - c1) * this.tileSize;

	this.ctx.save();
	this.ctx.beginPath();
	this.ctx.roundRect(cpx1 + 0.5, rpx1 + 0.5, wid, hei, this.tileSize / 6 + 2);
	this.ctx.stroke();
	this.ctx.clip();

	this.ctx.fillStyle = 'white';
	this.ctx.fillRect(cpx1, rpx1, wid, hei);

	this.ctx.fillStyle = 'white';
	this.ctx.shadowColor = 'white';
	if (tile[8] == 'v') {
		for (var i = 0; i < 6; i++) {
			this.setLocation(c1 + 1, r1 + i, tile[2 + i], indicate);
			this.setLocation(c1, r1 + 5 - i, tile[2 + i], indicate);
		}
	} else {
		for (var i = 0; i < 6; i++) {
			this.setLocation(c1 + i, r1, tile[2 + i], indicate);
			this.setLocation(c1 + 5 - i, r1 + 1, tile[2 + i], indicate);
		}
	}

	this.ctx.restore();

	this.ctx.strokeStyle = '#333';
	this.ctx.shadowBlur = 3;
	this.ctx.shadowColor = 'black';

	this.ctx.roundRect(cpx1 + 0.5, rpx1 + 0.5, wid, hei, this.tileSize / 6);
	this.ctx.stroke();
};

// returns whether the move has been processed
Box.prototype.setMove = function(move) {
	if (move < 0 || move >= this.moves.length) return false;
	if (move == this.curMove) return true;

	this.pts = [ Array(this.H), Array(this.H) ];
	for (var i = 0; i < this.H; i++) {
		this.pts[0][i] = Array(this.W).fill(0);
		this.pts[1][i] = Array(this.W).fill(0);
	}

	while (this.curMove < move) {
		++this.curMove;
		this.drawTile(this.curMove, this.curMove === move);
	}

	if (this.curMove > move) {
		this.initCanvas();
		for (var i = 0; i <= move; i++) this.drawTile(i, i === move);
		this.curMove = move;
	}

	// Update #canvas-2, to make the highlights correct.
	this.ctx2.clearRect(0, 0,
		this.padw + this.W * this.tileSize + this.lw,
		this.padh + this.H * this.tileSize + this.lw);

	for (var p = 0; p < 2; p++) {
		for (var r = 0; r < this.H; r++) {
			for (var c = 0; c < this.W; c++) {
				var num = this.pts[p][r][c];
				if (num == 0) continue;
				var label = (num < 0 ? "" : "+") + num.toString();
				this.ctx2.fillStyle = (num < 0 ? '#FF8888' : '#88FF88');

				this.ctx2.strokeText(label,
					this.padw + (c + 0.5) * this.tileSize,
					this.padh + 2 + (r + 0.25 + 0.5 * p) * this.tileSize);
				this.ctx2.fillText(label,
					this.padw + (c + 0.5) * this.tileSize,
					this.padh + 2 + (r + 0.25 + 0.5 * p) * this.tileSize);
			}
		}
	}

	this.updateScores();
	this.updateSelectedRow();
	return true;
};

// -----------------------------------------------------------------------------
// Event handlers:
// -----------------------------------------------------------------------------

Box.prototype.setRunning = function(running) {
	if (this.isRunning == running) return;

	this.isRunning = running;
	this.playPause.innerText = running ? 'Pause' : 'Play';

	var self = this, run = function() {
		if (!self.isRunning) return;

		if (self.setMove(self.curMove + 1)) {
			setTimeout(run, 500);
		} else {
			// last move has been reached.
			self.setRunning(false);
		}
	}
	if (this.isRunning) run();
}

Box.prototype.prevMove = function() { this.setRunning(false); this.setMove(this.curMove - 1); };
Box.prototype.nextMove = function() { this.setRunning(false); this.setMove(this.curMove + 1); };

Box.prototype.registerEvents = function() {
	this.playPause = document.getElementById('play-pause');

	var self = this;
	document.getElementById('first').onclick = function() { self.setRunning(false); self.setMove(0); };
	document.getElementById('last').onclick = function() { self.setRunning(false); self.setMove(self.moves.length - 1); };
	document.getElementById('prev').onclick = function() { self.prevMove(); };
	document.getElementById('next').onclick = function() { self.nextMove(); };
	this.playPause.onclick = function() { self.setRunning(!self.isRunning); };
};


Box.prototype.buildMoveTable = function() {
	var C = function(tag, kids, attrs) {
		var x = document.createElement(tag);
		for (kid in (kids||[])) x.appendChild(kids[kid]);
		if (attrs) {
			if (attrs['class']) x.className = attrs['class'];
			if (attrs['text']) x.innerText = attrs['text'];
			if (attrs['colspan']) x.setAttribute('colspan', attrs['colspan']);
		}
		return x;
	};

	var self = this, nplayers = 2;
	this.moveTable = document.getElementById('move-table').children[0];

	var head = [ C('th') ];
	for (var p = 0; p < nplayers; p++) {
		// cut-off on more than 20 characters in the name
		var playerName = "Player " + (p + 1).toString();
		if (this.playerNames) {
			var name = this.playerNames[p];
			if (name.length > 15) name = name.slice(0, 12) + "...";
			playerName = name;
		}
		head.push(C('th', [], {text: playerName}));
	}

	var firstrow = C('tr', [ C('th', [], {text: '0.'}), C('td', [], {text: self.moves[0], colspan: 2}) ]);
	firstrow.onclick = function() { self.setMove(0); };
	var rows = [firstrow];

	for (var i = 1; i < self.moves.length; i++) {
		var row = [ C('th', [], {text: i + '.'}) ], curp = (i + 1) % 2;
		for (var p = 0; p < nplayers; p++) {
			if (p == curp) row.push(C('td', [], {text: self.moves[i]}));
			else row.push(C('td'));
		}
		var tr = C('tr', row, {class: i % 2 ? 'zebra' : ''});
		tr.onclick = (function(move) { return function() { self.setMove(move); } })(i);
		rows.push(tr);
	}

	this.moveTableBody = C('tbody', rows);
	this.moveTable.onkeydown = function(event) {
		if (event.keyCode == 38 || event.keyCode == 37) {
			self.prevMove();
		} else if (event.keyCode == 40 || event.keyCode == 39) {
			self.nextMove();
		} else {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	this.moveTable.focus();

	this.moveTable.appendChild(C('table', [C('thead', [C('tr', head)]), this.moveTableBody]));
};

Box.prototype.updateSelectedRow = function() {
	var lastCurMove = document.getElementById('cur-move');
	var tbl = this.moveTable;

	// reset the id.
	if (lastCurMove) lastCurMove.id = '';

	if (this.curMove >= 0) {
		var curRow = this.moveTableBody.children[this.curMove];
		curRow.id = 'cur-move';

		var topCoord = curRow.offsetTop;
		var bottomCoord = curRow.offsetTop + curRow.offsetHeight - tbl.offsetHeight;
		if (tbl.scrollTop < bottomCoord) {
			tbl.scrollTop = bottomCoord;
		} else if (tbl.scrollTop > topCoord) {
			tbl.scrollTop = topCoord;
		}
	} else {
		tbl.scrollTop = 0;
	}
};
