var testStr = "Luc#as#asufnasfu#asffasf";
var hashIndex = testStr.indexOf("#")
if(hashIndex != -1)
    testStr = testStr.substring(0, hashIndex);

console.log(testStr);