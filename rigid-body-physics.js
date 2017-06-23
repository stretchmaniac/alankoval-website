//each object is a rigid polygon made up of an ordered list of points
//each point has mass -> calculate center of mass/moment of inertia from there
//has velocity, angular speed
var objects = [];

//optional universal gravitational field, in N/kg 
var gravitationalField = {x: 0, y: 1000};

//info about the current animation
var animation = {
    //whether there is animation or not. Set to false to stop animating
    animating: false,
    //this is the time of the previous frame, to get fps and other info
    previousFrame: null,
    //frames run in the current second
    totalFrames:0,
    //can't update fps too frequently, otherwise won't be able to see it.
    //so I'm updating is every second
    currentSecond:0,
    //animation id
    requestId:null
}

var coefficientOfRestitution = .1;

var mode = 'non-collision'
var width = 800;
var height = 800;


//This is insane: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
function intersectsPolygon(points, point){
    var i, j, c = false;
    var nvert = points.length;
    var testy = point.y;
    var testx = point.x;
    var vert = points;
    for (i = 0, j = nvert-1; i < nvert; j = i++) {
        if ( ((vert[i].y>testy) != (vert[j].y>testy)) &&
        (testx < (vert[j].x-vert[i].x) * (testy-vert[i].y) / (vert[j].y-vert[i].y) + vert[i].x) )
            c = !c;
        }
    return c;
}

var fpsId='fps'
function startPhysics(){
    //edges (really, really heavy blocks)
    createObject([
        {x:-500,y:750, mass:9e99},
        {x:900,y:750, mass:9e99},
        {x:900,y:900, mass:9e99},
        {x:-100,y:900, mass:9e99}
        ], {x: 0, y: 0}, 0, 'fixed');
    createObject([
        {x:-500,y:0, mass:9e99},
        {x:-500,y:750, mass:9e99},
        {x:50,y:750, mass:9e99},
        {x:50,y:0, mass:9e99}
        ], {x: 0, y: 0}, 0, 'fixed');
    createObject([
        {x:760,y:0, mass:9e99},
        {x:760,y:750, mass:9e99},
        {x:900,y:750, mass:9e99},
        {x:900,y:0, mass:9e99}
        ], {x: 0, y: 0}, 0, 'fixed');
    createObject([
        {x:0,y:0, mass:9e99},
        {x:0,y:80, mass:9e99},
        {x:900,y:80, mass:9e99},
        {x:900,y:0, mass:9e99}
        ], {x: 0, y: 0}, 0, 'fixed');
        
    
    animation.animating = true;
    requestAnimationFrame(function(){
        var time = new Date();
        var elapsed = 0;
        if(!!animation.previousFrame){
            elapsed = time.getTime() - animation.previousFrame;
        }
        //step(elapsed/1000);
        step(.01)
        animation.totalFrames++;
        if(time.getSeconds() != animation.currentSecond){
            animation.currentSecond = time.getSeconds();
            document.getElementById(fpsId).innerHTML = "fps: "+ animation.totalFrames;
            animation.totalFrames = 0;
        }
        animation.previousFrame = time;
        if(animation.animating === false){
            window.cancelAnimationFrame(animation.requestId);
        }else{
            var blah = arguments;
            animation.requestId = requestAnimationFrame(blah.callee);
            //setTimeout(function() {animation.requestId = requestAnimationFrame(blah.callee);}, 10);
        }
    });
}

function canvas1ButtonClicked(){
    mode='non-collision';
    canvasId='rigid-canvas1'
    fpsId='rigid-canvas1-fps'
    demoButtonClicked()
}

function canvas2ButtonClicked(){
    mode='non-collision-gravity';
    canvasId='rigid-canvas2'
    fpsId='rigid-canvas2-fps'
    demoButtonClicked()
}

function canvas3ButtonClicked(){
    if(mode != ''){
        stopPhysics();
    }
    mode='';
    canvasId='rigid-canvas3'
    fpsId='rigid-canvas3-fps'
    if(animation.animating === false){
        objects=[];
        startPhysics();
        gravitationalField={x:0,y:0};
        setTimeout(function(){
            stopPhysics()
        }, 1000*1200)
    }
    createObject([
        {x:Math.random()*300+150,y:Math.random()*300+150, mass:Math.random()*2+1},
        {x:Math.random()*300+150,y:Math.random()*300+150, mass:Math.random()*2+1},
        {x:Math.random()*300+150,y:Math.random()*350+150, mass:Math.random()*2+1}
        ],
        {x: 300*(Math.random()-.5), y: 300*(Math.random()-.5)}, Math.random()*4-2)
}

function randomGravity(){
    gravitationalField = {x:Math.random()*1000-500,y:Math.random()*1000-500};
}

function demoButtonClicked(){
    if(animation.animating === false){
        startPhysics();
        objects=[];
        setTimeout(function(){
            stopPhysics()
        }, 1000*1200)
    }
    createObject([
        {x:Math.random()*100+150,y:Math.random()*100+150, mass:Math.random()*5},
        {x:Math.random()*100+150,y:Math.random()*100+150, mass:Math.random()*5},
        {x:Math.random()*100+150,y:Math.random()*100+150, mass:Math.random()*5}
        ],
        {x: 300*(Math.random()-.5), y: 300*(Math.random()-.5)}, Math.random()*4-2)
}

function newObject(){
    createObject([
        {x:Math.random()*100+400,y:Math.random()*100+400, mass:Math.random()*5},
        {x:Math.random()*100+500,y:Math.random()*100+500, mass:Math.random()*5},
        {x:Math.random()*100+500,y:Math.random()*100+500, mass:Math.random()*5},
        {x:Math.random()*100+300,y:Math.random()*100+600, mass:Math.random()*5},
        {x:Math.random()*100+300,y:Math.random()*100+600, mass:Math.random()*5}
        ], {x: 1000*(Math.random()-.5), y: 1000*(Math.random()-.5)}, 1);
}

function stopPhysics(){
    animation.animating = false;
}

//one step in time, with dt as timeStep, in seconds
function step(timeStep){
    if(mode != 'non-collision' && mode != 'non-collision-gravity'){
        //keep a list of collisions so we can decide the order in which to compute them
        var collisions = [];
        //check for intersections between objects
        for(var p = 0; p < objects.length; p++){
            for(var q = p+1; q < objects.length; q++){
                var object1 = objects[p];
                var object2 = objects[q];
                collisions = collisions.concat(getCollisions(object1, object2));
            }
            var object = objects[p];
            computeForces(object, timeStep);
        }
        
        collisions.sort(function(a,b){
            return b.displacementAmount - a.displacementAmount;
        })
        for(var k = 0; k < collisions.length; k++){
            collision(collisions[k]);
        }
    }
    if(mode == 'non-collision-gravity'){
        for(var j = 0; j < objects.length; j++){
            computeForces(objects[j], timeStep);
        }
    }
    moveObjects(timeStep);
    drawObjects();
}

//computes electromagnetic force, gravitational, magnetic, etc
function computeForces(object, dt){
    if(object.fixed === false){
        var netForce = {x:0,y:0};
        netForce = add(netForce,scalar(object.mass, gravitationalField));
        
        var netAcceleration = scalar(1/object.mass, netForce);
        var deltaV = scalar(dt, netAcceleration);
        object.velocity = add(object.velocity, deltaV);
    }
}

var canvasId='canvas'
//and the all-important drawing step
function drawObjects(){
    var canvas = document.getElementById(canvasId);
    var ctx = canvas.getContext('2d');
    
    ctx.clearRect(0,0,canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(0,0,0,.8)'
    ctx.fillStyle = 'rgba(30,150,0,.5)'
    
    for(var i = 0; i < objects.length; i++){
        var object = objects[i];
        ctx.lineWidth = 1;
        
        //draw a little plus where the center of mass is
        ctx.beginPath();
        ctx.moveTo(object.centerOfMass.x - 3, object.centerOfMass.y);
        ctx.lineTo(object.centerOfMass.x + 3, object.centerOfMass.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(object.centerOfMass.x, object.centerOfMass.y - 3);
        ctx.lineTo(object.centerOfMass.x, object.centerOfMass.y + 3);
        ctx.stroke();
        
        //move through the points, connecting them together
        var initalPoint = object.points[0];
        ctx.beginPath();
        ctx.moveTo(initalPoint.x, initalPoint.y);
        for(var p = 1; p < object.points.length; p++){
            ctx.lineTo(object.points[p].x, object.points[p].y);
        }
        ctx.lineTo(initalPoint.x, initalPoint.y);
        ctx.stroke();
        
        //draw the points themselves, with bigger masses being larger circles
        //a ~ r*r, r = sqrt(mass)
        for(p = 0; p < object.points.length; p++){
            var loc = {x: object.points[p].x, y:object.points[p].y};
            var r = Math.sqrt(object.points[p].mass * 10);
            ctx.beginPath();
            ctx.arc(loc.x, loc.y, r, 0, Math.PI*2, true);
            ctx.fill();
        }
    }
}

//moves each object according to its linear/angular velocity
function moveObjects(timeStep){
    for(var p = 0; p < objects.length; p++){
        var object = objects[p];
        //delta x = v * t
        //experimental:
        //don't translate objects in the direction of a current collision
        var translate = {x: timeStep * object.velocity.x,y: timeStep * object.velocity.y};
        
        if(mode !== 'non-collision' && mode !== 'non-collision-gravity'){
            for(var k = 0; k < object.collisions.length; k++){
                var collVector = sub(object.collisions[k].collisionLoc, object.centerOfMass);
                //if translate has a component in the direction of collVector
                if(distBetweenPoints(collVector, translate) < magnitude(collVector)){
                    //project onto a vector perpendicular to collVector
                    translate = project(translate, rotateVec(collVector, Math.PI/2));
                }
            }
        }
        translateObject(object, translate.x, translate.y);
        //delta theta = w * t
        rotateObject(object, object.centerOfMass, timeStep * object.angularVelocity);
    }
}

//deal with the physics of a collision and change course
function collision(event){
    var point = event.point;
    var line = event.line;
    var collisionLoc = event.collisionLoc;
    var pointObj = event.pointObj;
    var lineObj = event.lineObj;
    //console.log(line)
    //the point is not exactly on the line, so we need to project the point onto the line to get the approx 
    //collision location
    //(line = A)
    var collisionLoc = projectOntoLine(point, line);
    var pointR = sub(point, pointObj.centerOfMass);
    var lineR = sub(collisionLoc, lineObj.centerOfMass);
    //the normal vector needs to point to lineObj
    var normal = normalToLine(line);
    //because pointR points in the right direction, we are using that as a guide
    normal = normalize(project(pointR, normal))
    
    var pointRPerp = rotateVec(pointR, Math.PI/2)
    var lineRPerp = rotateVec(lineR, Math.PI/2)
    var vP = add(pointObj.velocity, scalar(pointObj.angularVelocity, pointRPerp));
    var vL = add(lineObj.velocity, scalar(lineObj.angularVelocity, lineRPerp));
    var vLP = sub(vL,vP);
    
    //Well, I would have felt smarter if I did this myself, but Chris Hecker knocked it 
    //out of the park:
    //http://chrishecker.com/images/e/e7/Gdmphys3.pdf
    var impulse = dot(scalar(-(coefficientOfRestitution + 1),vLP), normal);
    
    impulse /= dot(normal, normal) * (1/pointObj.mass + 1/lineObj.mass) 
        + Math.pow(dot(lineRPerp,normal),2)/lineObj.momentOfInertia 
        + Math.pow(dot(pointRPerp,normal),2)/pointObj.momentOfInertia;
        
    //console.log(impulse)
    
    pointObj.velocity = add(pointObj.velocity, scalar(-impulse/pointObj.mass, normal));
    lineObj.velocity = add(lineObj.velocity, scalar(impulse/lineObj.mass, normal));
    
    pointObj.angularVelocity += dot(pointRPerp, scalar(-impulse, normal)) / pointObj.momentOfInertia;
    lineObj.angularVelocity += dot(lineRPerp, scalar(impulse, normal)) / lineObj.momentOfInertia;
    
    //now translate pointObj so that it isn't intersecting anymore
    var translation = event.displacement
    if(magnitude(translation) > 10){
        //console.log('HEY! HERE LOOK AT ME!');
        //console.log('translation')
        //console.log(translation)
        //console.log('coliisionloc')
        //console.log(collisionLoc)
        //console.log('point')
        //console.log(point)
        //console.log('line')
        //console.log(line)
    }
    if(pointObj.fixed === false){
        translateObject(pointObj, translation.x, translation.y);
    }
}

//determines the point in which 2 lines intersect. Thanks to Peter Kelly @ Stack overflow for this 
//delightful vector solution
function lineIntersection(line1, line2) {
    var p = line1.p1;
    var p2 = line1.p2;
    var q = line2.p1;
    var q2 = line2.p2;
	var r = sub(p2, p);
	var s = sub(q2, q);

	var uNumerator = cross(sub(q, p), r);
	var denominator = cross(r, s);

	if (uNumerator == 0 && denominator == 0) {
		// They are coLlinear
		
		// Do they touch? (Are any of the points equal?)
		if (equalPoints(p, q) || equalPoints(p, q2) || equalPoints(p2, q) || equalPoints(p2, q2)) {
			return true
		}
		// Do they overlap? (Are all the point differences in either direction the same sign)
		return !allEqual(
				(q.x - p.x < 0),
				(q.x - p2.x < 0),
				(q2.x - p.x < 0),
				(q2.x - p2.x < 0)) ||
			!allEqual(
				(q.y - p.y < 0),
				(q.y - p2.y < 0),
				(q2.y - p.y < 0),
				(q2.y - p2.y < 0));
	}

	if (denominator == 0) {
		// lines are paralell
		return false;
	}

	var u = uNumerator / denominator;
	var t = cross(sub(q, p), s) / denominator;

	if((t >= 0) && (t <= 1) && (u >= 0) && (u <= 1)){
	    return add(p, scalar(t, r));
	}else{
	    return null;
	}
}

//if point1 is equal to point2
function equalPoints(point1, point2) {
	return (point1.x == point2.x) && (point1.y == point2.y)
}

//if all the arguments are equal
function allEqual(args) {
	var firstValue = arguments[0],
		i;
	for (i = 1; i < arguments.length; i += 1) {
		if (arguments[i] != firstValue) {
			return false;
		}
	}
	return true;
}

//official channel to create object
//each point has x,y, mass
function createObject(points, velocity, angularVelocity, flags){
    var object = {
        points:points,
        velocity:velocity,
        angularVelocity:angularVelocity
    };
    
    setObjectMass(object);
    setCenterOfMass(object);
    setMomentofInertia(object, object.centerOfMass);
    
    object.fixed = (flags !== undefined && flags.indexOf('fixed') !== -1);
    objects.push(object);
    return object;
}

//adds up all the point masses to set up object property
function setObjectMass(object){
    object.mass = 0;
    for(var p = 0; p < object.points.length; p++){
        object.mass += object.points[p].mass;
    }
}

//center of mass = weighted average of points
function setCenterOfMass(object){
    var sumX = 0, sumY = 0;
    for(var p = 0; p < object.points.length; p++){
        sumX += object.points[p].x * object.points[p].mass;
        sumY += object.points[p].y * object.points[p].mass;
    }
    object.centerOfMass = {x: sumX / object.mass, y: sumY / object.mass};
}

//moment of inertia is equal to sum(mr^2). Note the axis will probably always be 
//the center of mass
//axisOfRotation is a point, not an actual axis. 
function setMomentofInertia(object, axisOfRotation){
    object.momentOfInertia = 0;
    object.axisOfRotation = axisOfRotation;
    for(var p = 0; p < object.points.length; p++){
        var r = distBetweenPoints(object.points[p], axisOfRotation);
        object.momentOfInertia += object.points[p].mass * r*r;
    }
}

//checks to see if any points of either object lies inside the other polygon
function getCollisions(object1, object2){
    var collisions = [];
    //which object has the point hitting the other's side?
    var pointObjs = [];
    //which object has the line that's hitting the other's side?
    var lineObjs = [];
    //what is the index of the offending point?
    var objPointIndexs = [];
    //iterate through all the points
    for(var p1 = 0; p1 < object1.points.length; p1++){
        if(intersectsPolygon(object2.points, object1.points[p1])){
            pointObjs.push(object1);
            objPointIndexs.push(p1);
            lineObjs.push(object2);
        }
    }
    //also need to iterate through the points of the other object
    for(var p2 = 0; p2 < object2.points.length; p2++){
        if(intersectsPolygon(object1.points, object2.points[p2])){
            pointObjs.push(object2);
            objPointIndexs.push(p2);
            lineObjs.push(object1);
        }
    }
    //compute various other entities, like point of intersection (for each intersection possible)
    for(var k = 0; k < lineObjs.length; k++){
        var lineObj = lineObjs[k];
        var pointObj = pointObjs[k];
        var point = pointObj.points[objPointIndexs[k]];
        //yes, it's ugly. You can stop hiding your face now
        var prevPoint =objPointIndexs[k] === 0 ? pointObj.points[pointObj.points.length - 1] : pointObj.points[objPointIndexs[k]-1];
        var nextPoint = objPointIndexs[k] === pointObj.points.length - 1 ? pointObj.points[0] : pointObj.points[objPointIndexs[k]+1];
        //compute which lines in the lineObj intersect the lines formed by point and prevPoint
        var intersectingLines = [];
        //the lines we are testing against
        var pointLine = {p1:{x: point.x, y: point.y}, p2:{x: prevPoint.x, y: prevPoint.y}};
        var pointLine2 = {p1:{x: point.x, y: point.y}, p2:{x: nextPoint.x, y: nextPoint.y}};
        for(var p = 0; p < lineObj.points.length; p++){
            //these are now the other objects (lineObj) points
            p1 = lineObj.points[p];
            var nextP = p + 1 === lineObj.points.length ? 0  : p + 1;
            nextP = lineObj.points[nextP];
            
            var line = {p1:{x: p1.x, y: p1.y}, p2:{x: nextP.x, y: nextP.y}}
            //console.log('line testing...')
            //console.log(line)
            
            var intersection = lineIntersection(line, pointLine);
            var intersection2 = lineIntersection(line, pointLine2);
            if(intersection !== null){
                //console.log('intersection')
                intersectingLines.push({line: line, intersection: intersection});
            }
            if(intersection2 !== null){
                //console.log('intersection')
                intersectingLines.push({line:line, intersection:intersection2});
            }
        }
        
        if(intersectingLines.length > 0){
            //find the intersection which is farthest away from the point
            //That way, a really fast object might go clear through another object and still detect the correct collision
            var farthestLine = null;
            var farthestDist = null;
            for(var h = 0; h < intersectingLines.length; h++){
                line = intersectingLines[h].line;
                intersection = intersectingLines[h].intersection;
                var dist = distBetweenPoints(point, intersection);
                //well, I haven't decided if the closest one is better or the farthest...
                if(farthestDist === null || dist < farthestDist){
                    farthestLine = line;
                    farthestDist = dist;
                }
            }
            
            line = farthestLine;
            point = point;
            var collisionLoc = projectOntoLine(point, line);
            //this is the "badness" factor (how much it is 'compressed')
            var translation = scalar(1.01,sub(collisionLoc, point));
            var magTrans = magnitude(translation)
            collisions.push({line:line, point:point, lineObj: lineObj, pointObj: pointObj, collisionLoc: collisionLoc, displacement: translation, displacementAmount: magTrans});
        }
    }
    object1.collisions = collisions;
    object2.collisions = collisions;
    return collisions;
}

//moves an entire object over by a specified amount
function translateObject(object, dx, dy){
    for(var p = 0; p < object.points.length; p++){
        var point = object.points[p];
        point.x += dx;
        point.y += dy;
    }
    object.centerOfMass.x += dx;
    object.centerOfMass.y += dy;
}

//rotates an object about an axis
//dTheta is the rotation amount, in radians, counter-clockwise = positive
function rotateObject(object, axis, dTheta){
    for(var p = 0; p < object.points.length; p++){
        object.points[p] = rotate(object.points[p], axis, dTheta);
    }
    //also rotate center of mass, if not the axis
    object.centerOfMass = rotate(object.centerOfMass, axis, dTheta);
}

//rotates a point by a specified amount around the specified axis
function rotate(point, axis, amount){
    var displacement = sub(point, axis);
    var angle = Math.atan2(displacement.y, displacement.x);
    var newAngle = angle + amount;
    var r = magnitude(displacement);
    var newDisplacement = {x: r*Math.cos(newAngle), y: r*Math.sin(newAngle)};
    var newPoint = add(axis, newDisplacement);
    newPoint.mass = point.mass;
    return newPoint;
}

//convenience method for rotate. Works specifically for a vector. Rotates counter-clockwise
function rotateVec(vec, amount){
    return rotate(vec, {x:0,y:0}, amount);
}

//projects a point onto a line (an extension of normal vector projection)
function projectOntoLine(point, line){
    //make the origin line.p1
    var lineVec = sub(line.p2, line.p1);
    var originPt = sub(point, line.p1);
    var newOriginPt = project(originPt, lineVec);
    return add(newOriginPt, line.p1);
}

//constructs a normal vector (perpendicular to line) magnitude 1
function normalToLine(line){
    var vec = sub(line.p2, line.p1);
    var newVec = normalTo(vec);
    return normalize(newVec);
}

//returns a perpendicular vector of the same length as the input
function normalTo(vec){
    return {x: vec.y, y: -vec.x};
}

//the vector projection of a onto b
function project(a, b){
    //proj of a anto b = a dot b / mag(b)^2 * b
    return scalar(dot(a,b)/(magnitude(b)*magnitude(b)), b);
}

//multiplies a vector by a scalar
function scalar(scalar, vector){
    return {x: vector.x * scalar, y: vector.y * scalar}; 
}

//equal to a-b
function sub(a,b){
    return {x: a.x - b.x, y: a.y - b.y}
}

//equal to a+b
function add(a,b){
    return {x: a.x + b.x, y: a.y + b.y}
}

//2d cross product
function cross(a,b){
    return a.x*b.y - a.y*b.x;
}

//returns the length of a vector
function magnitude(a){
    return Math.sqrt(a.x*a.x + a.y*a.y);
}

//the dot product of a and b
function dot(a,b){
    return a.x*b.x + a.y*b.y;
}

//returns a vector with the same direction as a but with magnitude 1
function normalize(a){
    var factor = 1/Math.sqrt(a.x*a.x + a.y*a.y);
    return scalar(factor,a);
}

//finds the euclidean distance between 2 points
function distBetweenPoints(a,b){
    return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
}