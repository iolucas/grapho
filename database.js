//Module to store the grapho database related stuff

//Import orm module
var Sequelize = require("sequelize");

function GraphoDB() {

    var self = this;

    this.init = function(callback) {

        //Init sequelize
        //In case of sqlite we need only the storage path
        var sequelize = new Sequelize('graphodb', 'user', 'pass', {
            
            // disable logging; default: console.log
            logging: false,

            //Dont know yet what is this
            pool: {
                max: 100,
                min: 0,
                idle: 10000
            },

            //MySQL only
            host: 'localhost',
            dialect: 'mysql' //database to use 

            // SQLite only
            //storage: 'database/database.sqlite',
            //dialect: 'sqlite' //database to use
        });

        //Define models

        //Model to represent a wikipedia url
        var Wikiurl = sequelize.define('wikiurl', {
            //Url of the article (the final path)
            url: {
                type: Sequelize.STRING(255),
                unique: "UrlLanguageUnique",
                allowNull: false
            },

            //Language of the url (en, pt,de, etc)
            lang: {
                type: Sequelize.STRING(10),
                unique: "UrlLanguageUnique",
                allowNull: false
            },

            //Text to be used to write some note to this link
            notes: {
                type:Sequelize.TEXT
            }
        }, {
            //Dont delete entry, just set flag
            paranoid: true,
            //underscored: true
        });

        //Model to represent a wikipedia article
        var Article = sequelize.define('article', {
            //Title of the article
            title: {
                type: Sequelize.STRING,
                allowNull: false
            },

            //Subtitle (for example a 'C#'' title may have a subtitle 'musical note' or 'programming language')
            subtitle: {
                type: Sequelize.STRING,
            },

            //A short description of what the article is about
            shortDescription: {
                type: Sequelize.TEXT,
            },

            //Page id from wikipedia
            wikiPageId: {
                type: Sequelize.STRING,
            },

            //Language of the page
            language: {
                type: Sequelize.STRING
            },

            //Text to be used to write some note to this link
            notes: {
                type:Sequelize.TEXT
            }

        }, {
            //Dont delete entry, just set flag
            paranoid: true,
            //underscored: true
        });


        //Model to represent a link from an wikiurl to an article and vise versa
        var ArticleLink = sequelize.define('articleLink', {
            
            //Where the link was found (abstract, body etc)
            /*place: {
                type:Sequelize.STRING,
                allowNull: false
            },*/
            
            //Flag setting whether this link were cutted from the final forward model
            cutted: {
                //Where the link was found (abstract, body etc)
                type:Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },

            //Text to be used to write some note to this link
            notes: {
                type:Sequelize.TEXT
            }

        },{
            paranoid: true,
            //underscored: true
        });


        //Create Relations

        //Relation to represent a url redirection to an article
        //This is need since a lot of wikipedia urls are redirected to same article 
        //(Ex.: Tibia_(computer_game) to Tibia_(video_game), TCP/IP to Internet protocol suite, etc)
        Article.hasMany(Wikiurl, {as: "RedirectUrl"});
        //Wikiurl.belongsTo(Article, {as: "RedirectUrl"}); //ANother options
        //Article.belongsTo(Article, {as: "RedirectUrl"});


        //Relations to store the links from one page and links to one page
        Article.belongsToMany(Wikiurl, { through: ArticleLink, as: "LinkFromHere", foreignKey: 'fromArticle', otherKey: 'toWikiurl' });
        Wikiurl.belongsToMany(Article, { through: ArticleLink, as: "ArticleToHere", foreignKey: 'toWikiurl', otherKey: 'fromArticle'});
        

        //Define the bi directional link relation         
        //Article.belongsToMany(Article, {as: "LinkFromHere", through: ArticleLink, foreignKey: 'from', otherKey: 'to'});
        //Article.belongsToMany(Article, {as: "LinkToHere", through: ArticleLink, foreignKey: 'to', otherKey: 'from'});
        

        //Extern models
        self.models = {
            Wikiurl: Wikiurl,
            Article: Article,
            ArticleLink: ArticleLink
        }



        //Sync models
        //This will create any missing table in the db
        //Use force: true to delete everything before sync
        var forceSync = false;

        //sequelize.sync({force:forceSync})
        Article.sync({force:forceSync})

            .then(function(){
                return Wikiurl.sync({force:forceSync});
            })

            .then(function(){
                return ArticleLink.sync({force:forceSync});
            })
        
            .then(function () {
                callback(); //Done initing, fire callback with no errors
            })
            
            .catch(function(error){ 
                callback(error);
            });
    }
}

module.exports = new GraphoDB();