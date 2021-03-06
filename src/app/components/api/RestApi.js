'use strict';

angular.module('RestApi', [ ])

/**
 * Further wrap AJAX reposnses with a standard result structure which captures response headers
 */
.factory('restRequest', [ 'promiseWrapper',
	function (promiseWrapper) {

		return function (resourceMethod, data, completionFunction) {
			var result = {
				data: null,
				error: null,
				headers: null
			};

			return promiseWrapper(
				resourceMethod(
					data,

					// success function
					function (value, headers) {
						// capture response headers
						result.headers = headers();
					}
				).$promise,

				// completeion function
				function (ok, response) {
					if (ok) {
						result.data = response;
					} else {
						result.error = response;
					}

					if (typeof completionFunction === 'function') {
						completionFunction(ok, result);
					}
				}
			);
		};
	}
])

/**
 * Wrap deferred AJAX operations with custom completionFunction
 */
.factory('promiseWrapper', [ '$q', '$location', 'Authentication', 'Moal',
	function ($q, $location, Authentication, Moal) {
		return function (promise, completionFunction) {
			var deferred = $q.defer();
			promise.then(
				function (data) {
					if (typeof(completionFunction) === 'function') {
						// Get rid of the angular bits which the handler doesn't need
						delete(data.$promise);
						delete(data.$resolved);
						deferred.resolve(completionFunction(true, data));
					} else {
						deferred.resolve(data);
					}
				}
			);

			promise.catch(
				function (error) {
					var res = error;
					switch (error.status) {

						// FF gives 0 as the status code for AJAX operations
						// that can't complete... other browsers too?
						case 0:
							Moal.showError('Lost communication with the server. Please try again.');
							break;

						// Unauthorized (session timed out, or user hit
						// an authenticated page before logging in)
						case 401:

							// Kill the session authentication
							Authentication.unauthenticate();

							// Redirect back to the login
							$location.path('/home');

							// What just happened?
							Moal.showWarning('Your session has timed out. Please sign in again.');
							break;

						// Any other error code we'll let the completion function execute
						default:
							if (typeof(completionFunction) === 'function') {
								res = completionFunction(false, error);
							}
							break;
					}
					deferred.reject(res);
				}
			);

			return deferred.promise;
		};
	}
]);

