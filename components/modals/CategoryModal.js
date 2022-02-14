import Image from "next/image";
import {
  addCategory,
  removeCategory,
  getOrderedCategoryList,
} from "../../evercent";

function CategoryModal(props) {
  let isToggling = false;

  const toggleCategory = async (item, level, isChecked) => {
    console.log("BudgetChartInfo - toggleCategory");
    console.log("IsChecked: ", isChecked);
    console.log("Level: ", level);
    console.log("Item:  ", item);

    // First
    //   Update the YNAB categories list so that the correct item's "inUserList"
    //   field is set properly. That way, when the CategoryModal re-renders, those items
    //   will be "checked" or selected in the list

    // Then,
    //   Add/Remove the category from the user's category list
    //     If the item exists, remove it
    //     If it doesn't exist, generate a new category based on the values from ynab

    let newYNABCategories = [...props.ynabCategories];
    let newUserCategoryList = [...props.userCategoryList];

    let newCats = [];
    if (level == "group") {
      let catList = newYNABCategories.find((x) => x.id == item.id).categories;

      catList.map((x) => {
        x.inUserList = isChecked;
        return x;
      });

      for (let i = 0; i < catList.length; i++) {
        newCats.push({
          catGroupID: catList[i].categoryGroupID,
          catID: catList[i].id,
        });
      }
    } else if (level == "category") {
      newYNABCategories
        .find((x) => x.id == item.categoryGroupID)
        .categories.find((x) => x.id == item.id).inUserList = isChecked;

      newCats.push({
        catGroupID: item.categoryGroupID,
        catID: item.id,
      });
    }

    console.log("New Cats", newCats);

    // For each of the categories, decide whether we should add/remove each one
    // from the user's category list
    for (let i = 0; i < newCats.length; i++) {
      if (isChecked) {
        // Add the information to the userCategoryList (newUserCategoryList)
        console.log("Adding category");
        addCategory(
          newUserCategoryList,
          newYNABCategories,
          newCats[i].catGroupID,
          newCats[i].catID
        );
      } else {
        console.log("Removing category");
        console.log("New User Category List", newUserCategoryList);
        // Remove the information from the userCategoryList (newUserCategoryList)
        removeCategory(
          newUserCategoryList,
          newCats[i].catGroupID,
          newCats[i].catID
        );
        console.log("Removed category");
        console.log("New User Category List", newUserCategoryList);
      }
    }

    newUserCategoryList = await getOrderedCategoryList(
      newUserCategoryList,
      newYNABCategories
    );

    console.log("About to set YNAB List", newYNABCategories);
    console.log("About to set User List", newUserCategoryList);
    props.setYnabCategories(newYNABCategories);
    props.setUserCategoryList(newUserCategoryList);

    // Lastly, set the "changesMade" to true so that the Save button shows up
    //    (only if the save button is hit should be new results be saved,
    //     either to the database OR to cookies)
    props.setChangesMade(true);
  };

  return (
    <div>
      <div className="flex justify-around">
        <div>
          <Image src="/ynab_logo.png" height="100px" width="100px" />
        </div>
        <div className="ml-10 flex-grow">
          <div className="font-bold text-lg text-center">YNAB Categories</div>
          <ul className="text-sm list-disc">
            <li>Here is a list of the categories in your YNAB Budget.</li>
            <li>
              Add/Remove them here, and then adjust the amounts per category on
              the Budget Helper chart!
            </li>
          </ul>
        </div>
      </div>

      <hr />

      <div className="flex flex-col m-5 h-[500px] overflow-y-auto">
        <ul>
          {props.ynabCategories.map((item, i) => {
            let isChecked = false;
            let isDeterminate = false;

            let numInUserList = item.categories.filter(
              (x) => x.inUserList
            ).length;

            if (numInUserList > 0) {
              if (numInUserList == item.categories.length) {
                isChecked = true;
              } else {
                isDeterminate = true;
              }
            }

            return (
              <li
                key={item.id}
                onClick={() => {
                  if (isToggling) {
                    isToggling = false;
                  } else {
                    console.log("CategoryModal - Toggle Group");
                    toggleCategory(item, "group", isDeterminate || !isChecked);
                  }
                }}
              >
                <input
                  type="checkbox"
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isDeterminate;
                    }
                  }}
                  checked={isChecked}
                  onChange={() => {}}
                />
                <span className="cursor-pointer font-bold">
                  {"  "}
                  {item.name}
                </span>
                <ul>
                  {item.categories.map((itemc, ci) => {
                    return (
                      <li
                        className="ml-10 cursor-pointer"
                        key={itemc.id}
                        onClick={() => {
                          isToggling = true;
                          console.log("CategoryModal - Toggle Category");
                          toggleCategory(itemc, "category", !itemc.inUserList);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={itemc.inUserList}
                          onChange={() => {}}
                        />
                        {"  "}
                        <span>{itemc.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default CategoryModal;
