const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}


export {asyncHandler}


// const asyncHandler = () => {}         // This is just to understand how we pass the function inside the parameter.
// const asyncHandler = (func) => { () => {}}  // So I could understand the below asyncHandler.
// const asyncHandler = (func) =>  () => {}
// const asyncHandler = (func) =>  async () => {}




// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//        res.status(err.code || 500).json({
//         success: false,
//         message: err.message
//        }) 
//     }
// }