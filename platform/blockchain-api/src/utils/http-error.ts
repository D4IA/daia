import { Response } from 'express';

/**
 * Utility class for handling HTTP errors.
 */
export class HttpError {
    /**
     * Sends a 400 Bad Request response.
     * Return if request is not valid.
     */
  static BadRequest(res: Response, message: string = 'Bad Request') {
    return res.status(400).json({
      statusCode: 400,
      message,
      error: 'Bad Request',
    });
  }

    /**
     * Sends a 404 Not Found response.
     * Return if the requested resource is not found.
     */
  static NotFound(res: Response, message: string = 'Not Found') {
    return res.status(404).json({
      statusCode: 404,
      message,
      error: 'Not Found',
    });
  }

    /**
     * Sends a 500 Internal Server Error response.
     * Return if server is not able to process the request.
     */
  static InternalServerError(res: Response, message: string = 'Internal Server Error') {
    return res.status(500).json({
      statusCode: 500,
      message,
      error: 'Internal Server Error',
    });
  }
}
