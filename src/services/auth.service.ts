import { AppError } from "@/error/AppError";
import { ILoginRequest } from "@/interface/request/auth.request";
import utils from "@/utils";
import { Log } from "@/utils/logger";
// Predefined credentials
const VALID_CREDENTIALS: ILoginRequest = {
    userid: 'admin',
    password: 'admin123'
};

class AuthService {
    async login(data: ILoginRequest) {

        Log.info("AuthService:::login:::attempt login");
        if (data.userid != VALID_CREDENTIALS.userid && data.password != VALID_CREDENTIALS.password) {
            throw new AppError("Invalid Credentials", utils.http.HttpStatusCodes.UNAUTHORIZED)
        }
        Log.info("AuthService:::login:::login successful");

    }
}

export default new AuthService();