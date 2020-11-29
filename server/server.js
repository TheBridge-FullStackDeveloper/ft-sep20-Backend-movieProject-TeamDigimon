//DEPENDENCIAS Y CONFIGURACIÓN INICIAL

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const base64 = require("base-64");
const crypto = require("crypto");
const fetch = require("node-fetch");
const { get } = require("http");
require("dotenv").config();
const myPublicFiles = express.static("../public");			//CONEXIÓN CON FICHERO public
const server = express();
const listenPort = 7777;
const client_id = "4ef49b85eefcbcbd9302";

const CLIENT_ID = process.env.CLIENT_ID;
const GH_SECRET = process.env.GH_SECRET;

server.use(myPublicFiles);
server.use(bodyParser.urlencoded({"extended":false}));
server.use(bodyParser.json());
server.use(cors());
server.use(cookieParser());
// ENDPOINTS Y COSAS NAZIS AQUÍ:
////// MYSQL CONNECTION
let mysql = require("mysql");
const { response } = require("express");
const { formatWithOptions } = require("util");
const { ObjectID } = require("mongodb");
let connection = mysql.createConnection({
	"host"     : "34.105.216.53",
	"user"     : "team-digimon",
	"password" : "",
	"database" : "usersMovie"
});

connection.connect(function(err) {
	if (err) {
		console.error(`error connecting: ${ err.stack}`);
		return;
	}

	console.log(`connected as id ${ connection.threadId}`);
});

connection.query("SELECT * FROM users", ["team-digimon"], function (error, results, fields) {

	if (error) {
		throw error;
	} else {
		console.log(results);
	}
});

// OAUTH GITHUB


server.get("/loginOAuth", (req, res) => {
	res.redirect(`https://github.com/login/oauth/authorize?client_id=${client_id}&scope=read:user,user:email`);
});

server.get("/login/github", (req, res) => {
	const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:user,user:email`;
	res.redirect(githubAuthUrl);
});

server.get("/redirectGH", async (req, res) => {

	if (req.query.code) {
		const requestCode = req.query.code;
		if (requestCode) {
			const token = await getTokenGH(requestCode);
			const userData = await getUserData(token);
			let newUser = {"user": userData.login, "avatar": userData.avatarUrl, "email" : userData.email};
			res.send(newUser);
			console.log(newUser);
		}


	} else {
		res.send({"msg": "Error"});
	}
});

async function getTokenGH (code) {
	// res.redirect("/index.html");
	if (code) {
		const res = await fetch("https://github.com/login/oauth/access_token", {
			"method": "POST",
			"headers": {
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			"body": JSON.stringify({
				"client_id": CLIENT_ID,
				"client_secret": GH_SECRET,
				code
			})
		});
		const data = await res.json();

		if (!data.error) {
			const token = `${data.token_type} ${data.access_token}`;
			return token;
		}
	}
	return {"msg": "Error"};
}
async function getUserEmail(token) {
	const res = await fetch("https://api.github.com/user/emails", {
		"headers": {
			"Authorization": token,
			"Accept": "application/vnd.github.v3+json"
		}
	});
	const emails = await res.json();
	return emails[0].email;
}
async function getUserData(token) {

	const res = await fetch("https://api.github.com/user", {
		"headers": {
			"Authorization": token,
			"Accept": "application/vnd.github.v3+json"
		}
	});
	const userData = await res.json();
	const email = await getUserEmail(token);

	///JWT
	const Payload = {
		"user" : req.body.user,
		"profile" : "user",
		"iat" : new Date()
	};
	const jwt = JWT(Payload);
	//Grant access based on profile
	switch (result[0].USER_PROFILE) {
	case "admin":
	{
		//Access as administrator
		res.cookie("JWT", jwt, {"httpOnly" : true})
			.send({"res" : "1", "msg" : "admin"});
		break;
	}
	}
	return {"login": userData.login, "avatarUrl": userData.avatar_url, email};
	// data; Tenemos los datos de usuario menos email
}
///////CONEXION CON MONGO VIA NATIVE DRIVERS//////////

const MongoClient = require("mongodb").MongoClient;
const uri = "mongodb+srv://Thedigimonbridge20:Thedigimonbridge20@moviesdigimon.gowkl.mongodb.net/MoviesDigimon?retryWrites=true&w=majority";
const client = new MongoClient(uri, { "useNewUrlParser": true, "useUnifiedTopology": true });
client.connect(err => {
	const collection = client.db("test").collection("devices");
	// perform actions on the collection object
	client.close();
});

///BORRAR PELICULAS de MONGODB////

server.post("/DeleteMovieMongo/", (req, res) => {
	try {
		MongoClient.connect(uri, (err, db) =>{
			if (err){
				throw err;
			}
			let ObjectDB = db.db("DigimonMovies");
			ObjectDB.collection("Movies").deleteOne(
				{"_id" : new ObjectID(req.body._id)}, (err, result) => {
					if (err){
						throw err;
					}
					if (result){
						res.send({"msg" : "Movie deleted"});
					} else {
						res.send({"msg": "NOT deleted"});
					}
					db.close();
				});
		});
	} catch (e){
		return { "msg" : "MongoDB error connection"};
	}
});

///GET PELICULA de MONGODB////
server.get("/GetMovieMongo", (req, res) => {
	try {
		MongoClient.connect(uri, (err, db) =>{
			if (err){
				throw err;
			}
			let ObjectDB = db.db("DigimonMovies");
			ObjectDB.collection("Movies").find({"_id":new ObjectID(req.body._id)})
				.toArray((err, result) => {
					if (err){
						throw err;
					}
					if (result){
						res.send(result);
					} else {
						res.send({"msg": "Movie NOT found"});
					}
					db.close();
				});
		});
	} catch (e){
		return { "msg":"MongoDB error connection"};
	}
});

//////COGER PELICULAS DE API OMDB//////
const API_KEY_OMBD = process.env.API_KEY_OMBD;
// console.log(API_KEY_OMBD);

server.get("/SearchMovies/:Title", (req, res) => {
	let Title = req.params.Title;

	if (Title !== null){
		fetch(`http://www.omdbapi.com/?s=${Title}&apikey=${API_KEY_OMBD}`)
			.then(response => response.json())
			.then(async data => {
				console.log(data);
				if (data.Search){
					const movieData = data.Search.map(movie => {
						const {Title, Year, imdbID, Poster} = movie;
						return {
							"Title" : Title,
							"Year" : Year,
							"Id": `O_${imdbID}`,
							"Img" : Poster
						};
					});
					res.send({"movies" : movieData});

				} else {
					res.send(await SearchinMongoTitle(Title));
				}
			})
			.catch({"msg" : "Error connection with Omdb"});
	} else {
		res.send({"msg" : "Empty Title"});
	}

});

server.get("/SearchExtra/:filmId", async (req, res) => {
	//Nuestra id puede tener 2 variantes:
	//	Mongo
	//	OMDB
	//Para poder distinguirlas:
	//	M_
	//	O_
	let filmId = req.params.filmId;
	console.log(filmId);
	if (filmId !== null){
		const id = filmId.substring(2);
		console.log("id =", id, "\nFilmID[0] =", filmId[0]);
		switch (filmId[0]) {
		case "M":
			//Buscar en mongo
			res.send(await SearchinMongoId(id));
			break;
		case "O":
			fetch(`http://www.omdbapi.com/?i=${id}&apikey=${API_KEY_OMBD}`)
				.then(response => response.json())
				.then(data => {
					console.log(data);
					if (data.Response === "True") {
						const movieData = {
							"Title" : data.Title,
							"Year" : data.Year,
							"Id": `O_${data.imdbID}`,
							"Img" : data.Poster
						};
						res.send({"movies" : movieData});

					}
				})
				.catch(() => {
					res.send({"msg" : "Error connection with Omdb"});
				});

			break;
		default:
			res.send({"msg":"Error Chungo"});
		}
	} else {
		res.send({"msg" : "Empty Title"});
	}

});


function SearchinMongoTitle(Title){

	return new Promise((res) => {
		try {
			MongoClient.connect(uri, (err, db) => {

				if (err) {
					throw err;
				}
				let ObjectDB = db.db("DigimonMovies");


				ObjectDB.collection("Movies").find({"Title": new RegExp(`.*${Title}`, "i")})
					.toArray((err, result) => {
						if (err) {
							throw err;
						}
						console.log(result);
						if (result.length){
							let movies = result.map(film => {
								return {
									// eslint-disable-next-line no-underscore-dangle
									"id": `M_${film._id}`,
									"Title": film.Title,
									"Img": film.Img,
									"Year": film.Year
								};
							});
							res({movies});
						} else {
							res({"msg":"NOT Found in MongoDB"});
						}
						//Cierro base de datos de Mongo
						db.close();
					});
			});

		} catch (e){
			res.send("error");
		}
	});
}
function SearchinMongoId (filmId){
	return new Promise((res) => {
		try {
			MongoClient.connect(uri, (err, db) =>{
				if (err){
					throw err;
				}
				let ObjectDB = db.db("DigimonMovies");
				ObjectDB.collection("Movies").find({"_id":new ObjectID(req.body._id)})
					.toArray((err, result) => {
						if (err){
							throw err;
						}
						if (result){
							res.send(result);
						} else {
							res.send({"msg": "Movie NOT found"});
						}
						db.close();
					});
			});
		} catch (e){
			return { "msg":"MongoDB error connection"};
		}

	});
}

///////////////////////SERVER LISTEN ON PORT ///////////////
server.listen(listenPort, () => {
	// eslint-disable-next-line no-console
	console.log(`http://localhost:7777/server listening on port ${listenPort}`);
});