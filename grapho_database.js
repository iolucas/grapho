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
                max: 5,
                min: 0,
                idle: 10000
            },

            //MySQL only
            //host: 'localhost', 

            // SQLite only
            storage: 'database/database.sqlite',
            dialect: 'sqlite', //database to use
        });

        //Define models
        var Article = sequelize.define('Article', {
            title: {
                type: Sequelize.STRING,
                allowNull: false
            },

            language: {
                type: Sequelize.STRING,
                unique: "UrlLanguageUnique",
                allowNull: false
            },

            url: {
                //Url must be unique, actually, a combination of url and lang must be unique
                type: Sequelize.STRING,
                unique: "UrlLanguageUnique",
                allowNull: false
            }

        }, {
            //Dont delete entry, just set flag
            paranoid: true,
            underscored: true
        });

        var ArticleTest = sequelize.define('ArticleTest', {
            title: {
                type: Sequelize.STRING,
                allowNull: false
            },

            language: {
                type: Sequelize.STRING,
                unique: "UrlLanguageUnique",
                allowNull: false
            },

            url: {
                //Url must be unique, actually, a combination of url and lang must be unique
                type: Sequelize.STRING,
                unique: "UrlLanguageUnique",
                allowNull: false
            }

        }, {
            //Dont delete entry, just set flag
            paranoid: true,
            underscored: true
        });

        //Model to represent a link from an article to another
        var ArticleLink = sequelize.define('ArticleLinks', {
            place: {
                //Where the link was found (abstract, body etc)
                type:Sequelize.STRING,
                allowNull: false
            }
        },{
            paranoid: true,
            underscored: true
        });

        //Define link relation
        //Article.belongsToMany(ArticleTest, {through: ArticleLink});
        //ArticleTest.belongsToMany(Article, {through: ArticleLink});
        
        Article.belongsToMany(Article, {as: "LinkFromHere", through: ArticleLink, foreignKey: 'from', otherKey: 'to'});
        Article.belongsToMany(Article, {as: "LinkToHere", through: ArticleLink, foreignKey: 'to', otherKey: 'from'});
        

        //Extern models
        self.models = {
            Article: Article,
            ArticleTest: ArticleTest
        }


        //Sync models
        //This will create any missing table in the db
        //Use force: true to delete everything before sync
        Article.sync({force: true})

            .then(function(){
                return ArticleLink.sync({force:true});

            })

            .then(function(){
                return ArticleTest.sync({force:true});

            })
        
            .then(function () {
                
                //Done initing, fire callback with no errors
                callback(null);

            }).catch(callback);
    }
}

module.exports = new GraphoDB();