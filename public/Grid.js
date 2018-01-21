/**
 * I stole this... See
 * http://www.mattpalmerlee.com/2012/04/10/creating-a-hex-grid-for-html5-games-in-javascript/
 * A Grid is the model of the playfield containing hexes
 * @constructor
 */
HT.Grid = function(/*double*/ width, /*double*/ height, /*integer*/ relataiveX, /*integer*/ relativeY, /*Array of Hexes*/map) {
	
	this.Hexes = [];
	this.map = map;
	//setup a dictionary for use later for assigning the X or Y CoOrd (depending on Orientation)
	var HexagonsByXOrYCoOrd = {}; //Dictionary<int, List<Hexagon>>

	var row = relataiveX;
	var y = 0.0;
	while (row < height + relataiveX)
	{
		var col = relativeY;

		var offset = 0.0;
		if (row % 2 == 1)
		{
			if(HT.Hexagon.Static.ORIENTATION == HT.Hexagon.Orientation.Normal)
				offset = (HT.Hexagon.Static.WIDTH - HT.Hexagon.Static.SIDE)/2 + HT.Hexagon.Static.SIDE;
			else
				offset = HT.Hexagon.Static.WIDTH / 2;
			col = relativeY;
		}
		
		var x = offset;
		while (col < width + relativeY)
		{
		    var hexId = this.GetHexId(row, col);
			var h = new HT.Hexagon(hexId, x, y, this.GetMapTile(col,row));
			
			var pathCoOrd = col;
			if(HT.Hexagon.Static.ORIENTATION == HT.Hexagon.Orientation.Normal)
				h.PathCoOrdX = col;//the column is the x coordinate of the hex, for the y coordinate we need to get more fancy
			else {
				h.PathCoOrdY = row;
				pathCoOrd = row;
			}
			
			this.Hexes.push(h);
			
			if (!HexagonsByXOrYCoOrd[pathCoOrd])
				HexagonsByXOrYCoOrd[pathCoOrd] = [];
			HexagonsByXOrYCoOrd[pathCoOrd].push(h);

			col+=1;
			if(HT.Hexagon.Static.ORIENTATION == HT.Hexagon.Orientation.Normal)
				x += HT.Hexagon.Static.WIDTH + HT.Hexagon.Static.SIDE;
			else
				x += HT.Hexagon.Static.WIDTH;
		}
		row++;
		if(HT.Hexagon.Static.ORIENTATION == HT.Hexagon.Orientation.Normal)
			y += HT.Hexagon.Static.HEIGHT / 2;
		else
			y += (HT.Hexagon.Static.HEIGHT - HT.Hexagon.Static.SIDE)/2 + HT.Hexagon.Static.SIDE;
	}

	//finally go through our list of hexagons by their x co-ordinate to assign the y co-ordinate
	for (var coOrd1 in HexagonsByXOrYCoOrd)
	{
		var hexagonsByXOrY = HexagonsByXOrYCoOrd[coOrd1];
		var coOrd2 = Math.floor(coOrd1 / 2) + (coOrd1 % 2);
		for (var i in hexagonsByXOrY)
		{
			var h = hexagonsByXOrY[i];//Hexagon
			if(HT.Hexagon.Static.ORIENTATION == HT.Hexagon.Orientation.Normal)
				h.PathCoOrdY = coOrd2++;
			else
				h.PathCoOrdX = (coOrd2++);
		}
	}
};

HT.Grid.prototype.GetHexId = function(row, col) {
	return {row:row, col:col};
};

/**
 * Returns a hex at a given point
 * @this {HT.Grid}
 * @return {HT.Hexagon}
 */
HT.Grid.prototype.GetHexAt = function(/*Point*/ p) {
	//find the hex that contains this point
	for (var h in this.Hexes)
	{
		if (this.Hexes[h].Contains(p))
		{
			return this.Hexes[h];
		}
	}

	return null;
};

/**
 * Returns a distance between two hexes
 * @this {HT.Grid}
 * @return {number}
 */
HT.Grid.prototype.GetHexDistance = function(/*Hexagon*/ h1, /*Hexagon*/ h2) {
	//a good explanation of this calc can be found here:
	//http://playtechs.blogspot.com/2007/04/hex-grids.html
	var deltaX = h1.PathCoOrdX - h2.PathCoOrdX;
	var deltaY = h1.PathCoOrdY - h2.PathCoOrdY;
	return ((Math.abs(deltaX) + Math.abs(deltaY) + Math.abs(deltaX - deltaY)) / 2);
};

/**
 * Returns a distance between two hexes
 * @this {HT.Grid}
 * @return {HT.Hexagon}
 */
HT.Grid.prototype.GetHexById = function(id) {
	for(var i in this.Hexes)
	{
		if(this.Hexes[i].Id == id)
		{
			return this.Hexes[i];
		}
	}
	return null;
};

HT.Grid.prototype.GetMapTile = function(x, y){
	for(var i in this.map){
		if(this.map[i].x === x && this.map[i].y === y){
			return this.map[i];
		}
	}
	return null;
}