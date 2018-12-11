/**---------------------------------------------------------------------------
 * > Super class of custom errnos
 *
 * @class Errno
 * @constructor
 * @extends Error
 */
class Errno extends Error{
  constructor(message){
    super(message);
    this.name = getClassName(this);
  }
}
/**---------------------------------------------------------------------------
 * > Argument Error
 *
 * @class ArgumentError
 * @constructor
 * @extends Errno
 */
class ArgumentError extends Errno{
  /**---------------------------------------------------------------------------
   * 
   */
  constructor(...args){
    let expected = 0, received = 0, message = '';
    if(getClassName(args[0]).toLowerCase == "string"){      
      message = args[0];
      expected = args[1]; received = args[2];
    }
    else{
      expected = args[0]; received = args[1];
    }
    message = message + "Expected " + expected + ", received " + received;
    super(message);
  }
}
/**---------------------------------------------------------------------------
 * > Http Error
 *
 * @class HttpError
 * @constructor
 * @extends Errno
 */
class HttpError extends Errno{
  constructor(...args){
    let message = ''
    switch(parseInt(args[0])){
      case 404:
        message = "Not found"
    }
    super("HttpRequestError: " + message);
  }
}
