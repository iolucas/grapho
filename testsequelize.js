

//Connect to the database
//In case of sqlite we need only the storage path
var sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost', 
    dialect: 'sqlite', //database to use

    //Dont know yet
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },

    // SQLite only
    storage: 'database/database.sqlite'
});


var User = sequelize.define('user', {
    firstName: {
        type: Sequelize.STRING,
        field: 'first_name' // Will result in an attribute that is firstName when user facing but first_name in the database
    },
    lastName: {
        type: Sequelize.STRING
    }
}, {
    freezeTableName: true // Model tableName will be the same as the model name
});

//Sync will create any missing table in the db
//Use force: true to delete everything before sync
User.sync({force: false}).then(function () {
    // Table created
    return User.create({
        firstName: 'John2',
        lastName: 'Hancock'
    });
});