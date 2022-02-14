import Image from "next/image";
import { useRouter } from "next/router";
import { useUser } from "@auth0/nextjs-auth0";
import { GetAuthURL } from "../../ynab";

import HomeIcon from "@heroicons/react/solid/HomeIcon";
import ExternalLinkIcon from "@heroicons/react/solid/ExternalLinkIcon";
import QuestionMarkCircleIcon from "@heroicons/react/outline/QuestionMarkCircleIcon";
import LoginIcon from "@heroicons/react/solid/LoginIcon";
import LogoutIcon from "@heroicons/react/solid/LogoutIcon";
import Link from "next/link";

function MySidebar({ isConnectedToYNAB }) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="w-64 text-center mr-2">
      <div className="flex justify-evenly items-center mt-2">
        <h2 className="mr-2 text-3xl font-cinzel">EverCent</h2>
        <Image
          src="/evercent_logo.png"
          className="object-contain"
          width={50}
          height={50}
          alt="My Logo"
        />
      </div>
      <div className="m-2 border-t border-gray-300"></div>
      <ul className="text-left ml-2">
        <li>
          <div
            className={`flex items-center font-semibold text-xl mb-1 p-3 rounded-lg hover:text-white hover:cursor-pointer ${
              router.pathname == "/" || router.pathname == "/home"
                ? "bg-blue-400 hover:bg-blue-400 text-white"
                : "hover:bg-blue-300"
            }`}
            onClick={() => {
              router.push("/");
            }}
          >
            <HomeIcon height={25} width={25} />
            <div className="ml-1">
              <Link href={"/"}>
                <a>Home</a>
              </Link>
            </div>
          </div>
        </li>

        <li>
          <div
            className={`flex items-center font-semibold text-xl mb-1 p-3 rounded-lg hover:text-white hover:cursor-pointer ${
              router.pathname == "/YNABTutorial"
                ? "bg-blue-400 hover:bg-blue-400 text-white"
                : "hover:bg-blue-300"
            }`}
            onClick={() => {
              router.push("/YNABTutorial");
            }}
          >
            <QuestionMarkCircleIcon height={25} width={25} />
            <div className="ml-1">
              <a href="/YNABTutorial">Tutorial</a>
            </div>
          </div>
        </li>

        {!isConnectedToYNAB && (
          <li>
            <div
              className={`flex items-center font-semibold text-xl mb-1 p-3 rounded-lg hover:text-white hover:cursor-pointer hover:bg-blue-300`}
              onClick={() =>
                router.push(
                  GetAuthURL(
                    process.env.YNAB_CLIENT_ID,
                    process.env.YNAB_REDIRECT_URI
                  )
                )
              }
            >
              <ExternalLinkIcon height={25} width={25} />
              <div className="ml-1">Connect to YNAB</div>
            </div>
          </li>
        )}

        <li>
          <div
            className={`flex items-center font-semibold text-xl p-3 rounded-lg hover:text-white hover:cursor-pointer hover:bg-blue-300`}
            onClick={() => {
              if (user) {
                router.push("/api/auth/logout");
              } else {
                router.push("/api/auth/login");
              }
            }}
          >
            {user ? (
              <>
                <LogoutIcon height={25} width={25} />
                <div className="ml-1">Logout</div>
              </>
            ) : (
              <>
                <LoginIcon height={25} width={25} />
                <div className="ml-1">Login</div>
              </>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}

export default MySidebar;
