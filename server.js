var http = require('http'),
    express = require('express'),
    mysql = require('mysql'),
    parser = require('body-parser'),
    PHPUnserialize = require('php-unserialize');

var connection = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : 'rootroot',
    database : 'marmiton'
});
try {
    connection.connect();
} catch(erreur) {
    console.log('Databases Connection failed:' + erreur);
}

var app = express();
app.use(parser.json());
app.use(parser.urlencoded({ extended: true }));
app.set('port', process.env.PORT || 8080);

//app.get('/api', function(req, res){
//});

http.createServer(app).listen(app.get('port'), function(){
    console.log('serveur ecoute :' + app.get('port'));
});


/*** ROUTE 1 ***/
app.get("/api/recipes.json",function(req,res){
    var query = "SELECT id, name, slug FROM ??";
    var table = ["recipes__recipe"];
    query = mysql.format(query,table);
    connection.query(query,function(err,rows){
	if(err) {
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(400).json({"error" : true, "message" : "error executing MySQL query"});
	} else {
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(200).json({"code" : 200, "message" : "success", "datas" : rows});
	}
    });
});

/*** ETAPE 2 ***/
app.get("/api/recipes/:recipe.json",function(req,res){
    var query = 'SELECT recipes__recipe.id AS recipeid, recipes__recipe.name, users__user.id AS userid, users__user.username, users__user.last_login, users__user.id, recipes__recipe.slug, recipes__recipe.step FROM recipes__recipe INNER JOIN users__user ON recipes__recipe.user_id = users__user.id WHERE slug = ?'
    var table = [req.params.recipe];
    query = mysql.format(query,table);
    connection.query(query,function(err,rows){
	if (rows.length > 0) {
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    for (var i = 0; i < rows.length; i++) {
		res.json({'code' : 200,'message' : 'success','datas' : {
		    "id": rows[0].recipeid,
		    "name": rows[0].name,
		    "user": {
			"username": rows[0].username,
			"last_login": rows[0].last_login,
			"id": rows[0].userid
		    },
		    "slug": rows[0].slug,
		    "step": PHPUnserialize.unserialize(rows[0].step)
		}
			 });
	    }
	} else {
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(404).json({"code" : 404, "message" : "Not found"});
	}

    });
});

/*** ETAPE 3 ***/
app.get("/api/users/:name/recipes.json",function(req,res){
    var name = req.params.name;
    var query = "SELECT recipes__recipe.id, recipes__recipe.name, recipes__recipe.slug FROM recipes__recipe INNER JOIN users__user ON recipes__recipe.user_id = users__user.id WHERE users__user.username = ?";
    var table = [name];
    query =  mysql.format(query,table);
    connection.query(query,function(err,rows){
	if(err || rows == 0){
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(404).json({"code" : 404, "message" : "Not found"});
	} else {
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(200).json({"code" : 200, "message" : "success", "datas" : rows});
	}
    });
});

/*** ETAPE 5 ***/

app.post('/api/users/:userRecipe/recipes.json', function (req, res) {

    var userRecipe = req.params.userRecipe;
    var token = req.headers.authorization;
    var slug = req.body.slug;
    connection.query('SELECT id, last_login, username from users__user where username = "' + userRecipe + '"',function(error, results, fields){
	
	if (!results[0]){
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(401).json({"code": 401,"message": "User not found"});
	    res.end();
	}
	else{
	    var id = results[0].id;
	    var last_login = results[0].last_login;
	    var username = results[0].username;
	    
	    
	    connection.query('SELECT user_id,token from users__access_token where token = "' + token + '"',function(error, results, fields){
		if ((!results[0]) || (username!=results[0].token)){
		    res.status(403).json({"code": 403,"message": "Acces denied"});
		    res.end();
		}
		else{
		    var user_id = results[0].user_id;
		    var name = req.body.name;
		    var slug = req.body.slug;
		    var step = req.body.step;
		    
		    connection.query('INSERT INTO recipes__recipe (user_id, name, slug, step)  VALUES  ("' + user_id + '", "' + name + '", "' + slug + '", "' + step + '")',function(error, results, fields){
			if (error){
			    res.setHeader('Access-Control-Allow-Origin', '*');
			    res.status(400).json({"code": 400,"message": "bad request"});
			    res.end();
			}
			else{
			    connection.query('SELECT MAX(id) as "id_recipe" from recipes__recipe',function(error, results, fields){
				if (!results[0]){
				    res.setHeader('Access-Control-Allow-Origin', '*');
				    res.status(404).json({"code": 404,"message": "not found"});
				    res.end();
				}
				else{
				    var id_recipe_modif = results[0].id_recipe;
				    res.setHeader('Access-Control-Allow-Origin', '*');
				    res.status(201).json({
					"code": 201,
					"message": "success",
					"datas": {
					    "id": id_recipe_modif,
					    "name": name,
					    "user": {
						"username": username,
						"last_login": last_login,
						"id": id
					    },
					    "slug": slug,
					    "step": [step]
					}
				    });
				    res.end();
				}
			    });
			}
		    });
		}
	    });
	}
    });
});

/*** ETAPE 6 ***/

app.put('/api/users/:user_recipe/recipes/:name_recipe.json', function (req, res) {
    res.header("Content-Type", "application/json; charset=utf-8");
    var user_recipe = req.params.user_recipe;
    var token = req.headers.authorization;
    var name_recipe = req.params.name_recipe;
    var split = name_recipe.toString().split('.');
    console.log(split);

    connection.query('SELECT id,last_login,username from users__user where username = "' + user_recipe + '"',function(error, results, fields){
	if (!results[0]){
	    res.status(401).json({"code": 401,"message": "User not found"});
	    res.end();
	}
	else{
	    var id = results[0].id;
	    var last_login = results[0].last_login;
	    var username = results[0].username;
	    connection.query('SELECT user_id,token from users__access_token where token = "' + token + '"',function(error, results, fields){
		if ((!results[0]) || (username!=results[0].token)){
		    res.status(403).json({"code": 403,"message": "Acces denied"});
		    res.end();
		}
		else{
		    var user_id = results[0].user_id;
		    connection.query('SELECT id,name,slug,step from recipes__recipe where slug = "'+split[0]+'"',function(error, results, fields){
			if (!results[0]){
			    res.status(404).json({"code": 404,"message": "not found"});
			    res.end();
			}
			else{
			    var name = req.body.name;
			    var slug = req.body.slug;
			    var step = req.body.step;
			    if(!req.body.name)
			    {
				name = results[0].name;
			    }
			    if (!req.body.slug)
			    {
				slug = results[0].slug;
			    }
			    if (!req.body.step)
			    {
				step = results[0];
			    }
			    var requete = "UPDATE recipes__recipe SET name='"+name+"',slug='"+slug+"',step='"+step+"' WHERE slug ='"+split[0]+"'";
			    connection.query(requete,function(error, results, fields){
				if (error){
				    res.status(400).json({"code": 400,"message": error});
				    res.end();
				} else {
				    connection.query('SELECT id,name,slug,step from recipes__recipe where slug = "'+slug+'"',function(error, results, fields){
					var step =results[0].step;
					step = step.toString().split('"');
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.status(200).json({
					    "code": 200,
					    "message": "success",
					    "datas": {
						"id": results[0].id,
						"name": results[0].name,
						"user": {
						    "username": username,
						    "last_login": last_login,
						    "id": id
						},
						"slug": results[0].slug,
						"step": {step
							}
					    }
					});
					res.end();
				    });
				}
			    });
			}
		    });
		}
	    });
	}
    });
});

/*** ETAPE 7 ***/

app.delete('/api/users/:user_recipe/recipes/:name_recipe.json', function (req, res) {

    var user_recipe = req.params.user_recipe;
    var token = req.headers.authorization;
    var name_recipe = req.params.name_recipe;
    var split = name_recipe.toString().split('.');

    connection.query('SELECT id,last_login,username from users__user where username = "' + user_recipe + '"',function(error, results, fields){
	if (!results[0]){
	    res.setHeader('Access-Control-Allow-Origin', '*');
	    res.status(401).json({"code": 401,"message": "User not found"});
	    res.end();
	}
	else{
	    var id = results[0].id;
	    var last_login = results[0].last_login;
	    var username = results[0].username;
	    connection.query('SELECT user_id,token from users__access_token where token = "' + token + '"',function(error, results, fields){
		if ((!results[0]) || (username!=results[0].token)){
		    res.setHeader('Access-Control-Allow-Origin', '*');
		    res.status(403).json({"code": 403,"message": "Acces denied"});
		    res.end();
		}
		else{
		    var user_id = results[0].user_id;
		    var name = req.body.name;
		    connection.query('SELECT id from recipes__recipe where slug = "'+split[0]+'"',function(error, results, fields){
			if (!results[0]){
			    res.setHeader('Access-Control-Allow-Origin', '*');
			    res.status(404).json({"code": 404,"message": "not found"});
			    res.end();
			}
			else{
			    var id = results[0].id;
			    connection.query('DELETE from recipes__recipe WHERE slug = "'+ split[0] +'"',function(error, results, fields){
				if (error){
				    res.setHeader('Access-Control-Allow-Origin', '*');
				    res.status(400).json({"code": 400,"message": "bad request"});
				    res.end();
				}
				else{
				    res.setHeader('Access-Control-Allow-Origin', '*');
				    res.status(200).json({
					"code": 200,
					"message": "success",
					"datas": {
					    "id": id
					}
				    });
				    res.end();
				}
			    });
			}
		    });
		}
	    });
	}
    });
});


// ROUTE PAR DEFAULT //
    app.use(function(req, res){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).json({"code" : 404, "message" : "Not found"});
});
